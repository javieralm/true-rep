import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { updateExerciseSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.exercise.findFirst({ where: { id, deleted_at: null } });
  if (!existing) return fail("Exercise not found", 404);
  if (existing.trainer_id !== trainer.id) return fail("Not your exercise", 403);

  const input = await parseBody(req, updateExerciseSchema);
  const exercise = await db.exercise.update({ where: { id }, data: input });
  return ok(exercise);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.exercise.findFirst({ where: { id, deleted_at: null } });
  if (!existing) return fail("Exercise not found", 404);
  if (existing.trainer_id !== trainer.id) return fail("Not your exercise", 403);

  await db.exercise.update({ where: { id }, data: { deleted_at: new Date() } });
  return ok({ deleted: true });
});
