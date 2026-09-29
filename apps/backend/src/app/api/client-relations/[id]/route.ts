import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { updateClientSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

async function ownRelation(id: string, trainerId: string) {
  const relation = await db.trainerClient.findFirst({ where: { id, trainer_id: trainerId } });
  if (!relation) throw fail("Client not found", 404);
  return relation;
}

/** El entrenador activa, pausa o termina a un cliente, cambia cómo le cobra y
 * hasta cuándo ha pagado (efectivo). Es su interruptor de acceso. */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const relation = await ownRelation(id, trainer.id);
  const input = await parseBody(req, updateClientSchema);

  // Un invitado aún no ha entrado: no se le puede activar ni pausar, solo
  // cambiar cómo pagará o retirar la invitación (DELETE).
  if (relation.status === "INVITED" && input.status && input.status !== "ENDED")
    return fail("El cliente aún no ha aceptado la invitación", 409);

  const updated = await db.trainerClient.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.billing ? { billing: input.billing } : {}),
      ...(input.paid_until !== undefined
        ? { paid_until: input.paid_until ? new Date(input.paid_until) : null }
        : {}),
    },
  });

  // Terminar la relación también retira su programa: deja de ser su cliente.
  if (input.status === "ENDED" && relation.client_id) {
    await db.programAssignment.updateMany({
      where: { user_id: relation.client_id, is_active: true, program: { trainer_id: trainer.id } },
      data: { is_active: false },
    });
  }
  return ok(updated);
});

/** Retirar una invitación que aún no se ha aceptado. */
export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();
  const relation = await ownRelation(id, trainer.id);
  if (relation.status !== "INVITED") return fail("Solo se pueden retirar invitaciones pendientes", 409);

  if (relation.clerk_invitation_id) {
    try {
      const clerk = await clerkClient();
      await clerk.invitations.revokeInvitation(relation.clerk_invitation_id);
    } catch (e) {
      // Ya aceptada o caducada en Clerk: da igual, sin la fila no hay acceso.
      console.error("Clerk revoke invitation error:", e);
    }
  }
  await db.trainerClient.delete({ where: { id } });
  return ok({ id });
});
