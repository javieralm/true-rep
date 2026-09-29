import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { merchantStatus } from "@/lib/stripe";
import type { ConnectStatus } from "@truerep/shared";

/** Estado de la cuenta de Stripe del entrenador. Relee la cuenta en Stripe y
 * guarda si puede cobrar: se llama al volver del alta y al abrir "Cobros". */
export const GET = handler(async () => {
  const trainer = await requireTrainer();
  if (!trainer.stripe_account_id) return ok<ConnectStatus>({ state: "not_connected", dashboard_url: null });

  let status: Awaited<ReturnType<typeof merchantStatus>>;
  try {
    status = await merchantStatus(trainer.stripe_account_id);
  } catch (e) {
    console.error("Stripe account status error:", e);
    return fail("No se ha podido consultar tu cuenta de Stripe", 502);
  }
  const canCharge = status === "active";
  if (canCharge !== trainer.stripe_charges_enabled) {
    await db.user.update({ where: { id: trainer.id }, data: { stripe_charges_enabled: canCharge } });
  }
  // "none": la cuenta existe solo para pagar la cuota de efectivo; para el
  // entrenador sigue sin tener Stripe conectado.
  if (status === "none") return ok<ConnectStatus>({ state: "not_connected", dashboard_url: null });
  return ok<ConnectStatus>({
    state: canCharge ? "ready" : "onboarding",
    dashboard_url: "https://dashboard.stripe.com/",
  });
});
