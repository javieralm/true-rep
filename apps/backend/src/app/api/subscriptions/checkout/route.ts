import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripe, PLAN_PRICES } from "@/lib/stripe";
import { checkoutSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { plan } = await parseBody(req, checkoutSchema);
  const price = PLAN_PRICES[plan];
  if (!price) return fail("Plan not configured", 500);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
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
