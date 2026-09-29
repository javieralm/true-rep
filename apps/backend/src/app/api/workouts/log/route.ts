import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireClientAccess } from "@/lib/auth";
import { clientRelation, evaluateAccess } from "@/lib/access";
import { calcXp, nextStreak, checkAchievements } from "@/lib/gamification";
import { logWorkoutSchema } from "@truerep/shared";
import type { Exercise } from "@truerep/shared";

// Anti XP-farming: cuánto por encima de la duración nominal de la rutina se
// tolera antes de rechazar el log (margen para series extra, descansos, etc).
const MAX_DURATION_MULTIPLIER = 1.5;
const DURATION_GRACE_MINUTES = 10;

// Cuánto esperar por el advisory lock antes de rendirse (evita que un
// request colgado agote el pool de conexiones interactive-transaction).
const ADVISORY_LOCK_TIMEOUT = "5s";

// Retos sociales: alcance diferido (ver TODOS.md). Se puede apagar sin tocar
// código si llega a bloquear o degradar el loop núcleo de logging.
const CHALLENGES_AUTOCOMPLETE_ENABLED = process.env.FEATURE_CHALLENGES_ENABLED !== "false";

type RoutineForValidation = {
  duration_minutes: number;
  exercises: unknown;
  is_published: boolean;
  deleted_at: Date | null;
};

function validateAgainstRoutine(
  routine: RoutineForValidation,
  input: { duration_minutes: number; exercises_completed: { exercise_id: string }[] }
) {
  const routineExercises = routine.exercises as unknown as Exercise[];
  const validExerciseIds = new Set(routineExercises.map((e) => e.id));
  const unknownExercise = input.exercises_completed.find((e) => !validExerciseIds.has(e.exercise_id));
  if (unknownExercise) {
    throw fail(`Exercise not found in this routine: ${unknownExercise.exercise_id}`, 400);
  }
  const maxReasonableMinutes =
    Math.ceil(routine.duration_minutes * MAX_DURATION_MULTIPLIER) + DURATION_GRACE_MINUTES;
  if (input.duration_minutes > maxReasonableMinutes) {
    throw fail(
      `duration_minutes exceeds what's reasonable for this routine (max ${maxReasonableMinutes})`,
      400
    );
  }
}

export const POST = handler(async (req: Request) => {
  // Tier Base: registrar entrenamientos requiere suscripción activa
  const user = await requireClientAccess();
  const input = await parseBody(req, logWorkoutSchema);

  // Un usuario solo puede loguear contra rutinas publicadas (mismo criterio
  // que GET /api/routines usa para no-owners) — antes esto solo chequeaba
  // deleted_at, dejando abierto un borrador como oráculo de contenido.
  const routine = await db.routine.findFirst({
    where: { id: input.routine_id, deleted_at: null, is_published: true },
  });
  if (!routine) return fail("Routine not found", 404);
  validateAgainstRoutine(routine, input);

  // Transacción interactiva: streak, suscripción y la propia rutina se
  // releen DENTRO de la transacción (no se confía en los snapshots tomados
  // antes de empezar), detrás de un advisory lock de Postgres scoped al
  // usuario. Sin el lock, dos requests concurrentes podrían pasar ambas el
  // chequeo de duplicado antes de que cualquiera haga commit (TOCTOU) — el
  // lock serializa los logs de un mismo usuario para que el segundo request
  // SÍ vea el workout que el primero acaba de crear.
  const { workout, updatedUser, deduped } = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${ADVISORY_LOCK_TIMEOUT}'`);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

    // now() de Postgres, no del server de Node: evita que un request demorado
    // antes de adquirir el lock ordene su timestamp por detrás de uno más
    // reciente que sí llegó a tiempo.
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT now() as now`;

    // Idempotencia real: un reintento con la misma key siempre encuentra el
    // workout ya creado, sin depender de una ventana de tiempo (que
    // fusionaría dos workouts legítimos del mismo usuario+rutina en <60s, o
    // dejaría pasar un reintento a los 61s).
    const recentDuplicate = await tx.workout.findFirst({
      where: { user_id: user.id, idempotency_key: input.idempotency_key },
    });
    if (recentDuplicate) {
      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      return { workout: recentDuplicate, updatedUser: currentUser, deduped: true };
    }

    const freshUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    // Re-chequeo del acceso: el entrenador puede pausar al cliente (o una
    // cancelación de Stripe llegar por webhook) mientras este request
    // esperaba el lock.
    if (freshUser.role !== "TRAINER" && !freshUser.is_superadmin) {
      const state = evaluateAccess(await clientRelation(tx, freshUser), now);
      if (state === "payment_required") throw fail("Payment required", 402);
      if (state !== "active") throw fail("Client access required", 403);
    }

    // Re-leer la rutina dentro de la transacción: si un trainer la editó o
    // despublicó entre la validación de arriba y este punto, el log no debe
    // quedar validado contra una definición que ya no existe.
    const freshRoutine = await tx.routine.findFirst({
      where: { id: input.routine_id, deleted_at: null, is_published: true },
    });
    if (!freshRoutine) throw fail("Routine not found", 404);
    validateAgainstRoutine(freshRoutine, input);

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
        idempotency_key: input.idempotency_key,
      },
    });
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { xp: { increment: xpEarned }, streak, streak_last_workout_date: now },
    });
    return { workout, updatedUser, deduped: false };
  });

  // El workout ya está guardado en este punto: un fallo en achievements o en
  // el auto-complete de retos no debe convertirse en un 500 que le mienta al
  // cliente sobre el resultado real. Ambos viven fuera de la transacción del
  // núcleo a propósito — retos es alcance diferido (ver TODOS.md) y no debe
  // poder bloquear ni encadenarse al commit del loop de retención principal.
  let unlockedAchievements: string[] = [];
  if (!deduped) {
    if (CHALLENGES_AUTOCOMPLETE_ENABLED) {
      try {
        await db.challengeParticipant.updateMany({
          where: {
            user_id: user.id,
            completed_at: null,
            challenge: {
              routine_id: input.routine_id,
              starts_at: { lte: workout.completed_at },
              ends_at: { gte: workout.completed_at },
            },
          },
          data: { completed_at: workout.completed_at },
        });
      } catch (e) {
        console.error(
          `challengeParticipant auto-complete failed for user ${user.id} after workout ${workout.id}:`,
          e
        );
      }
    }
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
