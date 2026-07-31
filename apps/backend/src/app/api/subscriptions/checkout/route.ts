import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripe, PLAN_PRICES } from "@/lib/stripe";
import { checkoutSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  // Upgrades/downgrades se hacen desde el Billing Portal, no con un checkout nuevo
  if (user.subscription_status === "ACTIVE")
    return fail("Already subscribed — use the billing portal to change plan", 409);
  const { plan } = await parseBody(req, checkoutSchema);
  const price = PLAN_PRICES[plan];
  if (!price) return fail("Plan not configured", 500);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Reusar el Customer de Stripe si ya existe (ex-suscriptor que vuelve)
      // para no fragmentar su historial de pago/métodos en un Customer nuevo.
      ...(user.stripe_customer_id
        ? { customer: user.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      metadata: { user_id: user.id, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });
    return ok({ checkout_url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return fail("Could not create checkout session", 502);
  }
});
