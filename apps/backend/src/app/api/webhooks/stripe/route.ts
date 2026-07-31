import type Stripe from "stripe";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { stripe, priceToPlan } from "@/lib/stripe";

export const POST = handler(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return fail("Missing signature", 400);

  // Regla no negociable #6: firma verificada siempre
  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return fail("Invalid signature", 400);
  }

  // Stripe statuses that mean the user still has access
  const STRIPE_ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) break;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      // Idempotency: skip if already processed for this subscription
      const existing = await db.user.findUnique({ where: { id: userId }, select: { subscription_id: true } });
      if (subscriptionId && existing?.subscription_id === subscriptionId) break;
      await db.user.update({
        where: { id: userId },
        data: {
          subscription_status: "ACTIVE",
          subscription_id: subscriptionId,
          subscription_plan: session.metadata?.plan === "premium" ? "PREMIUM" : "BASE",
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const periodEnd = sub.current_period_end;
      // El plan puede cambiar desde el Billing Portal (upgrade/downgrade): derivarlo del price
      const plan = priceToPlan(sub.items.data[0]?.price?.id);
      await db.user.updateMany({
        where: { subscription_id: sub.id },
        data: {
          subscription_status: STRIPE_ACTIVE_STATUSES.has(sub.status) ? "ACTIVE" : "CANCELLED",
          subscription_expires_at: periodEnd ? new Date(periodEnd * 1000) : null,
          ...(plan ? { subscription_plan: plan } : {}),
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.user.updateMany({
        where: { subscription_id: sub.id },
        data: { subscription_status: "CANCELLED", subscription_plan: null },
      });
      break;
    }
  }

  return ok({ received: true });
});
