import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";
import { syncTrainerBillingLater } from "@/lib/trainer-billing";
import { commissionOverrideSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.union([z.object({ role: z.enum(["USER", "TRAINER"]) }), commissionOverrideSchema]);

/** Superadmin: promueve o degrada a TRAINER, o fija el porcentaje de comisión
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

  const updated = await db.user.update({
    where: { id },
    data: { commission_percent_override: input.commission_percent_override },
    select: { id: true, commission_percent_override: true },
  });
  syncTrainerBillingLater(id);
  return ok({ ...updated, commission_percent_override: input.commission_percent_override });
});
