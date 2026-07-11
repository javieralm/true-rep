import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { updateRoutineSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const routine = await db.routine.findFirst({
    where: { id, deleted_at: null },
    include: { trainer: { select: { id: true, username: true, avatar_url: true } } },
  });
  if (!routine) return fail("Routine not found", 404);
  return ok(routine);
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
