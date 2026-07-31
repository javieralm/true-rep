import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { updateProgramSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const program = await db.program.findFirst({
    where: { id, trainer_id: trainer.id, deleted_at: null },
    include: {
      items: {
        include: {
          routine: { select: { id: true, title: true, difficulty: true, duration_minutes: true } },
        },
        orderBy: [{ week: "asc" }, { day: "asc" }, { order: "asc" }],
      },
      assignments: {
        where: { is_active: true },
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
  });
  if (!program) return fail("Program not found", 404);
  return ok(program);
});

export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.program.findFirst({
    where: { id, trainer_id: trainer.id, deleted_at: null },
  });
  if (!existing) return fail("Program not found", 404);

  const { items, ...meta } = await parseBody(req, updateProgramSchema);

  // Solo rutinas propias: evita exponer borradores de otros trainers a los clientes
  if (items?.length) {
    const routineIds = [
      ...new Set(items.filter((it) => it.type === "ROUTINE" && it.routine_id).map((it) => it.routine_id!)),
    ];
    if (routineIds.length) {
      const owned = await db.routine.count({
        where: { id: { in: routineIds }, trainer_id: trainer.id, deleted_at: null },
      });
      if (owned !== routineIds.length) return fail("Some routines are not yours or do not exist", 400);
    }
  }

  // ponytail: los items se reemplazan enteros en una transacción — sin diffing
  await db.$transaction([
    db.program.update({ where: { id }, data: meta }),
    ...(items
      ? [
          db.programItem.deleteMany({ where: { program_id: id } }),
          db.programItem.createMany({
            data: items.map((it) => ({
              program_id: id,
              week: it.week,
              day: it.day,
              order: it.order,
              type: it.type,
              routine_id: it.type === "ROUTINE" ? it.routine_id : null,
              data: it.type === "ROUTINE" ? undefined : (it.data ?? undefined),
            })),
          }),
        ]
      : []),
  ]);

  return ok({ updated: true });
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const existing = await db.program.findFirst({
    where: { id, trainer_id: trainer.id, deleted_at: null },
  });
  if (!existing) return fail("Program not found", 404);

  await db.program.update({ where: { id }, data: { deleted_at: new Date() } });
  return ok({ deleted: true });
});
