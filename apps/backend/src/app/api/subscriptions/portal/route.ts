import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

/** Billing Portal de Stripe: upgrade/downgrade de plan, cancelación, facturas */
export const POST = handler(async () => {
  const user = await requireUser();
  if (!user.subscription_id) return fail("No subscription to manage", 404);

  try {
    const sub = await stripe.subscriptions.retrieve(user.subscription_id);
    const session = await stripe.billingPortal.sessions.create({
      customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });
    return ok({ portal_url: session.url });
  } catch (e) {
    console.error("Stripe portal error:", e);
    return fail("Could not create portal session", 502);
  }
});
