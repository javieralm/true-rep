import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripeRelation } from "@/lib/access";
import { stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";

/** Portal de Stripe del cliente, en la cuenta de su entrenador: tarjeta,
 * facturas y cancelación. */
export const POST = handler(async () => {
  const user = await requireUser();
  const relation = await stripeRelation(db, user.id);
  const stripeAccount = relation?.trainer.stripe_account_id;
  if (!relation?.stripe_customer_id || !stripeAccount) return fail("Aún no has pagado con Stripe", 404);

  try {
    const session = await stripe().billingPortal.sessions.create(
      { customer: relation.stripe_customer_id, return_url: `${requireEnv("NEXT_PUBLIC_APP_URL")}/pago` },
      { stripeAccount }
    );
    return ok({ portal_url: session.url });
  } catch (e) {
    console.error("Stripe portal error:", e);
    return fail("No se ha podido abrir la gestión del pago. Inténtalo de nuevo.", 502);
  }
});
