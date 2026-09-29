import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { assignProgramSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

/** Solo se asignan programas a clientes propios (activos o pausados). Antes
 * valía cualquier suscriptor Premium de la plataforma, fuera de quien fuera. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const program = await db.program.findFirst({
    where: { id, trainer_id: trainer.id, deleted_at: null },
  });
  if (!program) return fail("Program not found", 404);

  const { user_id, start_date } = await parseBody(req, assignProgramSchema);

  const isClient = await db.trainerClient.findFirst({
    where: { trainer_id: trainer.id, client_id: user_id, status: { in: ["ACTIVE", "PAUSED"] } },
  });
  if (!isClient) return fail("Solo puedes asignar programas a tus clientes", 403);

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
