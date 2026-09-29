import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";
import { platformSettings } from "@/lib/platform";
import { syncTrainerBillingLater } from "@/lib/trainer-billing";
import { platformSettingsSchema, type PlatformSettingsDto } from "@truerep/shared";

function dto(s: Awaited<ReturnType<typeof platformSettings>>): PlatformSettingsDto {
  return { commission_tiers: s.commission_tiers, cash_fee_amount: s.cash_fee_amount, cash_fee_currency: s.cash_fee_currency };
}

export const GET = handler(async () => {
  await requireSuperadmin();
  return ok(dto(await platformSettings(db)));
});

/** Tramos de comisión y cuota de efectivo. Al cambiar, se recalcula lo que
 * paga cada entrenador que ya cobra con Stripe o tiene cuota. */
export const PUT = handler(async (req: Request) => {
  await requireSuperadmin();
  const input = await parseBody(req, platformSettingsSchema);
  await platformSettings(db); // garantiza la fila
  await db.platformSettings.update({ where: { id: 1 }, data: input });

  const trainers = await db.user.findMany({
    where: { OR: [{ stripe_account_id: { not: null } }, { trainer_clients: { some: { status: "ACTIVE", billing: "CASH" } } }] },
    select: { id: true },
  });
  // ponytail: todos en una tarea tras la respuesta; con cientos de entrenadores,
  // pasarlo a un cron que sincronice por lotes.
  syncTrainerBillingLater(...trainers.map((t) => t.id));
  return ok(dto(await platformSettings(db)));
});
