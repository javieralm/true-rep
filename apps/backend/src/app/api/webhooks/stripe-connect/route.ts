import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { ACCESS_SUBSCRIPTION_STATUSES } from "@/lib/access";

/** Estados de los que una suscripción ya no vuelve. */
const FINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

/** Webhook de "Cuentas conectadas": las suscripciones de los clientes viven en
 * la cuenta de su entrenador (direct charges) y llegan aquí con event.account.
 * Solo escuchamos customer.subscription.*: traen el estado completo, así que
 * un pago fallido llega como past_due/unpaid sin mirar las facturas. */
export const POST = handler(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return fail("Missing signature", 400);
  const webhookSecret = requireEnv("STRIPE_CONNECT_WEBHOOK_SECRET");

  // Regla no negociable #6: firma verificada siempre
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch {
    return fail("Invalid signature", 400);
  }

  if (!event.type.startsWith("customer.subscription.") || !event.account) return ok({ received: true });
  const sub = event.data.object as Stripe.Subscription;
  const account = event.account;

  // El evento se registra en la misma transacción que sus cambios: si algo
  // falla no queda marcado, Stripe lo reintenta, y un reintento de un evento
  // ya aplicado choca con la clave primaria y no hace nada.
  try {
    await db.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });

      const relation = await tx.trainerClient.findFirst({
        where: {
          OR: [{ stripe_subscription_id: sub.id }, { id: sub.metadata?.trainer_client_id ?? "" }],
        },
        include: { trainer: { select: { stripe_account_id: true } } },
      });
      // Un entrenador tiene el panel completo de Stripe y podría poner en sus
      // metadatos el id de un cliente ajeno: solo vale su propia cuenta.
      if (!relation || relation.trainer.stripe_account_id !== account) return;

      const sameSub = relation.stripe_subscription_id === sub.id;
      // Un evento viejo que llega tarde no resucita una suscripción terminada…
      if (sameSub && FINAL_STATUSES.has(relation.subscription_status ?? "")) return;
      // …ni una suscripción anterior pisa a la nueva, salvo que la nueva ya no dé acceso.
      if (
        relation.stripe_subscription_id &&
        !sameSub &&
        ACCESS_SUBSCRIPTION_STATUSES.has(relation.subscription_status ?? "") &&
        !ACCESS_SUBSCRIPTION_STATUSES.has(sub.status)
      ) {
        return;
      }

      const item = sub.items.data[0];
      await tx.trainerClient.update({
        where: { id: relation.id },
        data: {
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          subscription_status: sub.status,
          // En APIs recientes el fin de periodo está en cada item, no en la suscripción.
          current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
          price_id: item?.price.id ?? null,
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return ok({ received: true, duplicate: true });
    }
    throw e;
  }

  return ok({ received: true });
});
