import type Stripe from "stripe";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { stripe, priceToPlan } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";

export const POST = handler(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return fail("Missing signature", 400);

  // Fuera del try a propósito: si falta el secreto es un error de
  // configuración (500 con el nombre de la variable), no una firma inválida.
  // Dentro del try se tragaba como "Invalid signature" y mandaba a depurar
  // el sitio equivocado.
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");

  // Regla no negociable #6: firma verificada siempre
  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
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
      const customerId = typeof session.customer === "string" ? session.customer : null;
      // Idempotency: skip if already processed for this subscription
      const existing = await db.user.findUnique({ where: { id: userId }, select: { subscription_id: true } });
      if (subscriptionId && existing?.subscription_id === subscriptionId) break;
      await db.user.update({
        where: { id: userId },
        data: {
          subscription_status: "ACTIVE",
          subscription_id: subscriptionId,
          // Persistido para reusarlo en el próximo checkout (evita fragmentar
          // el historial de pago del usuario en un Customer nuevo cada vez).
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          subscription_plan: session.metadata?.plan === "premium" ? "PREMIUM" : "BASE",
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      // En APIs recientes el fin de periodo está en cada item, no en la suscripción.
      const periodEnd = sub.items.data[0]?.current_period_end;
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
