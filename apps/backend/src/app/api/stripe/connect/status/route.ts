import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { accountCanCharge } from "@/lib/stripe";
import type { ConnectStatus } from "@truerep/shared";

/** Estado de la cuenta de Stripe del entrenador. Relee la cuenta en Stripe y
 * guarda si puede cobrar: se llama al volver del alta y al abrir "Cobros". */
export const GET = handler(async () => {
  const trainer = await requireTrainer();
  if (!trainer.stripe_account_id) return ok<ConnectStatus>({ state: "not_connected", dashboard_url: null });

  let canCharge: boolean;
  try {
    canCharge = await accountCanCharge(trainer.stripe_account_id);
  } catch (e) {
    console.error("Stripe account status error:", e);
    return fail("No se ha podido consultar tu cuenta de Stripe", 502);
  }
  if (canCharge !== trainer.stripe_charges_enabled) {
    await db.user.update({ where: { id: trainer.id }, data: { stripe_charges_enabled: canCharge } });
  }
  return ok<ConnectStatus>({
    state: canCharge ? "ready" : "onboarding",
    dashboard_url: "https://dashboard.stripe.com/",
  });
});
