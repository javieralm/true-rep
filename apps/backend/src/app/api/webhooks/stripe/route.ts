import type Stripe from "stripe";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { stripe } from "@/lib/stripe";

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) break;
      await db.user.update({
        where: { id: userId },
        data: {
          subscription_status: "ACTIVE",
          subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          subscription_plan: session.metadata?.plan === "annual" ? "ANNUAL" : "MONTHLY",
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const periodEnd = sub.current_period_end;
      await db.user.updateMany({
        where: { subscription_id: sub.id },
        data: {
          subscription_status: sub.status === "active" ? "ACTIVE" : "CANCELLED",
          subscription_expires_at: periodEnd ? new Date(periodEnd * 1000) : null,
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
