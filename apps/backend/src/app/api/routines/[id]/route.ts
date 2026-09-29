import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer, requireClientAccess } from "@/lib/auth";
import { computeWeightSuggestions } from "@/lib/progression";
import { withLibraryDefaults } from "@/lib/routine-exercises";
import { updateRoutineSchema } from "@truerep/shared";
import type { Exercise, ExerciseCompleted } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

// Cuántos workouts recientes del usuario se miran para el auto-escalado —
// suficiente para cubrir ~1 mes de entrenamiento sin escanear todo el historial.
const SUGGESTION_LOOKBACK = 20;

/** Una rutina: para su entrenador, o para un cliente suyo con acceso. Las
 * rutinas son el trabajo del entrenador; no se enseñan a cualquiera. */
export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const user = await requireClientAccess();
  const routine = await db.routine.findFirst({
    where: {
      id,
      deleted_at: null,
      ...(user.is_superadmin
        ? {}
        : {
            OR: [
              { trainer_id: user.id },
              { trainer: { trainer_clients: { some: { client_id: user.id, status: "ACTIVE" } } } },
            ],
          }),
    },
    include: { trainer: { select: { id: true, username: true, avatar_url: true } } },
  });
  if (!routine) return fail("Routine not found", 404);

  // Auto-escalado con el historial del propio usuario.
  let weight_suggestions: ReturnType<typeof computeWeightSuggestions> = [];
  {
    const exerciseIds = (routine.exercises as unknown as Exercise[]).map((e) => e.id);
    const recentWorkouts = await db.workout.findMany({
      where: { user_id: user.id },
      orderBy: { completed_at: "desc" },
      take: SUGGESTION_LOOKBACK,
      select: { completed_at: true, exercises_completed: true },
    });
    weight_suggestions = computeWeightSuggestions(
      recentWorkouts.map((w) => ({
        completed_at: w.completed_at,
        exercises_completed: w.exercises_completed as unknown as ExerciseCompleted[],
      })),
      exerciseIds
    );
  }

  const exercises = routine.exercises as unknown as Exercise[];
  const libraryIds = exercises.flatMap((e) => (e.exercise_id ? [e.exercise_id] : []));
  const library = libraryIds.length
    ? await db.exercise.findMany({
        where: { id: { in: libraryIds }, trainer_id: routine.trainer_id, deleted_at: null },
        select: { id: true, measure: true, video_url: true },
      })
    : [];

  return ok({ ...routine, exercises: withLibraryDefaults(exercises, library), weight_suggestions });
});

export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.routine.findFirst({ where: { id, deleted_at: null } });
  if (!existing) return fail("Routine not found", 404);
  if (existing.trainer_id !== trainer.id) return fail("Not your routine", 403);

  const input = await parseBody(req, updateRoutineSchema);
  const routine = await db.routine.update({ where: { id }, data: input });
  return ok(routine);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.routine.findFirst({ where: { id, deleted_at: null } });
  if (!existing) return fail("Routine not found", 404);
  if (existing.trainer_id !== trainer.id) return fail("Not your routine", 403);

  await db.routine.update({ where: { id }, data: { deleted_at: new Date(), is_published: false } });
  return ok({ deleted: true });
});
