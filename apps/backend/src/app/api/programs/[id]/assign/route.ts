import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { assignProgramSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

/** Solo se pueden asignar programas a suscriptores PREMIUM activos */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const program = await db.program.findFirst({
    where: { id, trainer_id: trainer.id, deleted_at: null },
  });
  if (!program) return fail("Program not found", 404);

  const { user_id, start_date } = await parseBody(req, assignProgramSchema);

  const user = await db.user.findUnique({ where: { id: user_id } });
  if (!user) return fail("User not found", 404);
  if (user.subscription_status !== "ACTIVE" || user.subscription_plan !== "PREMIUM")
    return fail("Programs can only be assigned to active Premium members", 402);

  // Un solo programa activo por usuario: desactivar los demás antes de asignar
  const [, assignment] = await db.$transaction([
    db.programAssignment.updateMany({
      where: { user_id, is_active: true, NOT: { program_id: id } },
      data: { is_active: false },
    }),
    db.programAssignment.upsert({
      where: { user_id_program_id: { user_id, program_id: id } },
      create: { program_id: id, user_id, start_date: new Date(start_date) },
      update: { start_date: new Date(start_date), is_active: true, created_at: new Date() },
    }),
  ]);
  return ok(assignment, 201);
});
