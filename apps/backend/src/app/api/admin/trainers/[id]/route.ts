import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";
import { syncTrainerBillingLater } from "@/lib/trainer-billing";
import { commissionOverrideSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([
  z.object({ role: z.enum(["USER", "TRAINER"]) }),
  z.object({ reject_application: z.literal(true) }),
  commissionOverrideSchema,
]);

/** Superadmin: promueve o degrada a TRAINER (aprobar una solicitud es
 * promover), rechaza una solicitud, o fija el porcentaje de comisión
 * propio de un entrenador (null = vuelve a los tramos). */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const admin = await requireSuperadmin();
  const input = await parseBody(req, patchSchema);

  const target = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return fail("User not found", 404);

  if ("role" in input) {
    if (id === admin.id) return fail("No puedes cambiar tu propio rol", 400);
    const updated = await db.user.update({
      where: { id },
      data: { role: input.role },
      select: { id: true, username: true, email: true, role: true },
    });
    return ok(updated);
  }

  if ("reject_application" in input) {
    await db.user.update({ where: { id }, data: { trainer_requested_at: null, trainer_application_note: null } });
    return ok({ id });
  }

  const updated = await db.user.update({
    where: { id },
    data: { commission_percent_override: input.commission_percent_override },
    select: { id: true, commission_percent_override: true },
  });
  syncTrainerBillingLater(id);
  return ok({ ...updated, commission_percent_override: input.commission_percent_override });
});
