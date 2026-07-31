import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireActiveSubscription } from "@/lib/auth";
import { calcXp, nextStreak, checkAchievements } from "@/lib/gamification";
import { logWorkoutSchema } from "@truerep/shared";
import type { Exercise } from "@truerep/shared";

// Ventana de deduplicación: reintentos de red / doble-tap en este rango se
// tratan como el mismo log en vez de duplicar workout + XP.
const RETRY_DEDUPE_WINDOW_MS = 60_000;

// Anti XP-farming: cuánto por encima de la duración nominal de la rutina se
// tolera antes de rechazar el log (margen para series extra, descansos, etc).
const MAX_DURATION_MULTIPLIER = 1.5;
const DURATION_GRACE_MINUTES = 10;

export const POST = handler(async (req: Request) => {
  // Tier Base: registrar entrenamientos requiere suscripción activa
  const user = await requireActiveSubscription();
  const input = await parseBody(req, logWorkoutSchema);

  const routine = await db.routine.findFirst({
    where: { id: input.routine_id, deleted_at: null },
  });
  if (!routine) return fail("Routine not found", 404);

  // Anti XP-farming: la duración y los ejercicios reclamados deben corresponder
  // a la rutina real, no a lo que el cliente decida enviar.
  const routineExercises = routine.exercises as unknown as Exercise[];
  const validExerciseIds = new Set(routineExercises.map((e) => e.id));
  const unknownExercise = input.exercises_completed.find((e) => !validExerciseIds.has(e.exercise_id));
  if (unknownExercise) {
    return fail(`Exercise not found in this routine: ${unknownExercise.exercise_id}`, 400);
  }
  const maxReasonableMinutes =
    Math.ceil(routine.duration_minutes * MAX_DURATION_MULTIPLIER) + DURATION_GRACE_MINUTES;
  if (input.duration_minutes > maxReasonableMinutes) {
    return fail(
      `duration_minutes exceeds what's reasonable for this routine (max ${maxReasonableMinutes})`,
      400
    );
  }

  const now = new Date();

  // Transacción interactiva: el streak se recalcula a partir de una lectura
  // fresca del usuario DENTRO de la transacción, y la comprobación de
  // idempotencia también vive aquí, detrás de un advisory lock de Postgres
  // scoped al usuario. Sin el lock, dos requests concurrentes podrían pasar
  // ambas el chequeo de duplicado antes de que cualquiera haga commit
  // (TOCTOU) — el lock serializa los logs de un mismo usuario para que el
  // segundo request SÍ vea el workout que el primero acaba de crear.
  const { workout, updatedUser, deduped } = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

    const recentDuplicate = await tx.workout.findFirst({
      where: {
        user_id: user.id,
        routine_id: input.routine_id,
        completed_at: { gte: new Date(now.getTime() - RETRY_DEDUPE_WINDOW_MS) },
      },
      orderBy: { completed_at: "desc" },
    });
    if (recentDuplicate) {
      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      return { workout: recentDuplicate, updatedUser: currentUser, deduped: true };
    }

    const freshUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const streak = nextStreak(freshUser.streak, freshUser.streak_last_workout_date, now);
    const xpEarned = calcXp(input.duration_minutes, streak);

    const workout = await tx.workout.create({
      data: {
        user_id: user.id,
        routine_id: input.routine_id,
        completed_at: now,
        duration_minutes: input.duration_minutes,
        exercises_completed: input.exercises_completed,
        xp_earned: xpEarned,
        notes: input.notes,
      },
    });
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { xp: { increment: xpEarned }, streak, streak_last_workout_date: now },
    });
    await tx.challengeParticipant.updateMany({
      where: {
        user_id: user.id,
        completed_at: null,
        challenge: { routine_id: input.routine_id, starts_at: { lte: now }, ends_at: { gte: now } },
      },
      data: { completed_at: now },
    });
    return { workout, updatedUser, deduped: false };
  });

  // El workout ya está guardado en este punto: un fallo en achievements no
  // debe convertirse en un 500 que le mienta al cliente sobre el resultado real.
  let unlockedAchievements: string[] = [];
  if (!deduped) {
    try {
      unlockedAchievements = await checkAchievements(updatedUser);
    } catch (e) {
      console.error(`checkAchievements failed for user ${updatedUser.id} after workout ${workout.id}:`, e);
    }
  }

  return ok(
    {
      ...workout,
      user: { xp: updatedUser.xp, streak: updatedUser.streak },
      unlocked_achievements: unlockedAchievements,
      deduped,
    },
    201
  );
});
