import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { createProgramSchema } from "@truerep/shared";

export const GET = handler(async () => {
  const trainer = await requireTrainer();
  const programs = await db.program.findMany({
    where: { trainer_id: trainer.id, deleted_at: null },
    include: { _count: { select: { items: true, assignments: { where: { is_active: true } } } } },
    orderBy: { updated_at: "desc" },
  });
  return ok(programs);
});

export const POST = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const input = await parseBody(req, createProgramSchema);
  const program = await db.program.create({
    data: { ...input, trainer_id: trainer.id },
  });
  return ok(program, 201);
});
