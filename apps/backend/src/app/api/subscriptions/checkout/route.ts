import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripe, planPrices } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { checkoutSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  // Upgrades/downgrades se hacen desde el Billing Portal, no con un checkout nuevo
  if (user.subscription_status === "ACTIVE")
    return fail("Already subscribed — use the billing portal to change plan", 409);
  const { plan } = await parseBody(req, checkoutSchema);
  const price = planPrices()[plan];
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      // Reusar el Customer de Stripe si ya existe (ex-suscriptor que vuelve)
      // para no fragmentar su historial de pago/métodos en un Customer nuevo.
      ...(user.stripe_customer_id
        ? { customer: user.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      metadata: { user_id: user.id, plan },
      success_url: `${appUrl}/checkout/success`,
      cancel_url: `${appUrl}/pricing`,
    });
    return ok({ checkout_url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return fail("Could not create checkout session", 502);
  }
});
