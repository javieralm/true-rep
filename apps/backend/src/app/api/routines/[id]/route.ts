import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer, optionalUser } from "@/lib/auth";
import { computeWeightSuggestions } from "@/lib/progression";
import { updateRoutineSchema } from "@truerep/shared";
import type { Exercise, ExerciseCompleted } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

// Cuántos workouts recientes del usuario se miran para el auto-escalado —
// suficiente para cubrir ~1 mes de entrenamiento sin escanear todo el historial.
const SUGGESTION_LOOKBACK = 20;

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const routine = await db.routine.findFirst({
    where: { id, deleted_at: null },
    include: { trainer: { select: { id: true, username: true, avatar_url: true } } },
  });
  if (!routine) return fail("Routine not found", 404);

  // Auto-escalado: solo si hay un usuario logueado (el navegador anónimo no
  // recibe sugerencias personalizadas).
  const user = await optionalUser();
  let weight_suggestions: ReturnType<typeof computeWeightSuggestions> = [];
  if (user) {
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

  return ok({ ...routine, weight_suggestions });
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
