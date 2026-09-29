import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ACCESS_SUBSCRIPTION_STATUSES, stripeRelation } from "@/lib/access";
import { currentCommission } from "@/lib/commission";
import { platformSettings } from "@/lib/platform";
import { stripe, trainerCanCharge } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { clientCheckoutSchema } from "@truerep/shared";

/** Pago del cliente a su entrenador: Checkout de Stripe en la cuenta del
 * entrenador (direct charges), con la comisión de TrueRep como
 * application_fee_percent. La app lo abre en el navegador. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { interval } = await parseBody(req, clientCheckoutSchema);
  const relation = await stripeRelation(db, user.id);
  if (!relation || relation.status !== "ACTIVE") return fail("Tu entrenador no tiene tu acceso activo", 409);
  if (relation.billing !== "STRIPE") return fail("Pagas a tu entrenador en efectivo", 409);
  if (relation.stripe_subscription_id && ACCESS_SUBSCRIPTION_STATUSES.has(relation.subscription_status ?? "")) {
    return fail("Ya tienes una suscripción. Gestiónala desde tu perfil.", 409);
  }

  const { trainer } = relation;
  const price = await db.trainerPrice.findFirst({
    where: { trainer_id: trainer.id, interval, active: true },
  });
  if (!price) return fail("Tu entrenador no ofrece esa periodicidad", 404);

  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  try {
    if (!(await trainerCanCharge(trainer))) return fail("Tu entrenador aún no puede cobrar con Stripe", 409);
    const activeClients = await db.trainerClient.count({ where: { trainer_id: trainer.id, status: "ACTIVE" } });
    const override = trainer.commission_percent_override;
    const { commission_tiers } = await platformSettings(db);
    const fee = currentCommission(activeClients, override == null ? null : Number(override), commission_tiers);

    const session = await stripe().checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: price.stripe_price_id, quantity: 1 }],
        // Reutilizar su Customer en la cuenta del entrenador si ya pagó antes.
        ...(relation.stripe_customer_id ? { customer: relation.stripe_customer_id } : { customer_email: user.email }),
        client_reference_id: relation.id,
        metadata: { trainer_client_id: relation.id },
        // El webhook identifica la relación por los metadatos de la suscripción.
        subscription_data: { application_fee_percent: fee, metadata: { trainer_client_id: relation.id } },
        success_url: `${appUrl}/pago?estado=ok`,
        cancel_url: `${appUrl}/pago?estado=cancelado`,
      },
      { stripeAccount: trainer.stripe_account_id! }
    );
    return ok({ checkout_url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return fail("No se ha podido abrir el pago. Inténtalo de nuevo.", 502);
  }
});
