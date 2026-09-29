import { after } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { platformSettings } from "@/lib/platform";
import { currentCommission } from "@/lib/commission";
import { ACCESS_SUBSCRIPTION_STATUSES } from "@/lib/access";

/** Estados de los que una suscripción ya no vuelve: hay que crear otra. */
const DEAD_STATUSES = new Set(["canceled", "incomplete_expired"]);

/** Deja en Stripe lo que TrueRep cobra a un entrenador, según sus clientes de hoy:
 *
 * 1. La comisión (application_fee_percent) de las suscripciones de sus clientes,
 *    por tramo de clientes activos o su porcentaje propio. Solo toca Stripe si
 *    cambia respecto a la última aplicada.
 * 2. La cuota por cliente en efectivo activo: una suscripción del entrenador en
 *    la cuenta de TrueRep (customer_account = su cuenta v2), con factura por
 *    email y quantity = clientes en efectivo activos. Si no tiene cuenta de
 *    Stripe se le crea una solo para pagar (sin alta ni verificación).
 *
 * Idempotente: se puede llamar de más. Llamarla tras cualquier cambio que mueva
 * esos números (cliente activado/pausado/terminado, cambio de forma de pago,
 * porcentaje propio, tramos, cuota). */
export async function syncTrainerBilling(trainerId: string): Promise<void> {
  const settings = await platformSettings(db);
  const trainer = await db.user.findUniqueOrThrow({ where: { id: trainerId } });
  const [activeClients, activeCash] = await Promise.all([
    db.trainerClient.count({ where: { trainer_id: trainerId, status: "ACTIVE" } }),
    db.trainerClient.count({ where: { trainer_id: trainerId, status: "ACTIVE", billing: "CASH" } }),
  ]);

  // 1. Comisión
  const override = trainer.commission_percent_override == null ? null : Number(trainer.commission_percent_override);
  const pct = currentCommission(activeClients, override, settings.commission_tiers);
  const applied = trainer.commission_percent_applied == null ? null : Number(trainer.commission_percent_applied);
  if (trainer.stripe_account_id && pct !== applied) {
    const subs = await db.trainerClient.findMany({
      where: { trainer_id: trainerId, stripe_subscription_id: { not: null } },
      select: { stripe_subscription_id: true, subscription_status: true },
    });
    for (const s of subs) {
      if (!ACCESS_SUBSCRIPTION_STATUSES.has(s.subscription_status ?? "")) continue;
      // Aplica desde la próxima factura; la ya cobrada no cambia.
      await stripe().subscriptions.update(
        s.stripe_subscription_id!,
        { application_fee_percent: pct },
        { stripeAccount: trainer.stripe_account_id }
      );
    }
    await db.user.update({ where: { id: trainerId }, data: { commission_percent_applied: pct } });
  }

  // 2. Cuota de efectivo
  const quantity = settings.cash_fee_amount > 0 ? activeCash : 0;
  let sub = trainer.cash_fee_subscription_id
    ? await stripe().subscriptions.retrieve(trainer.cash_fee_subscription_id)
    : null;
  if (sub && DEAD_STATUSES.has(sub.status)) sub = null;
  if (!sub && quantity === 0) return;

  const priceId = await cashFeePrice(settings);
  if (sub) {
    const item = sub.items.data[0];
    if (item.price.id === priceId && item.quantity === quantity) return;
    // ponytail: sin prorrateo, se cobra la cantidad que haya al renovar cada mes.
    // Prorratear si los entrenadores se quejan de pagar por un cliente dado de baja a mitad de mes.
    await stripe().subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId, quantity }],
      proration_behavior: "none",
    });
    return;
  }

  const accountId = await ensureCustomerAccount(trainer);
  const created = await stripe().subscriptions.create({
    customer_account: accountId,
    items: [{ price: priceId, quantity }],
    // Factura por email con enlace de pago: no hace falta pedirle una tarjeta antes.
    collection_method: "send_invoice",
    days_until_due: 14,
    metadata: { truerep_trainer_id: trainerId },
  });
  // Si otra sincronización se adelantó, sobra esta: se cancela.
  const saved = await db.user.updateMany({
    where: { id: trainerId, OR: [{ cash_fee_subscription_id: null }, { cash_fee_subscription_id: trainer.cash_fee_subscription_id }] },
    data: { cash_fee_subscription_id: created.id },
  });
  if (!saved.count) await stripe().subscriptions.cancel(created.id);
}

/** Precio de la cuota en la cuenta de TrueRep. Si cambia el importe se crea uno
 * nuevo; las suscripciones pasan a él en su próxima sincronización. */
async function cashFeePrice(settings: Awaited<ReturnType<typeof platformSettings>>): Promise<string> {
  if (settings.cash_fee_stripe_price_id) {
    const price = await stripe().prices.retrieve(settings.cash_fee_stripe_price_id);
    if (price.active && price.unit_amount === settings.cash_fee_amount && price.currency === settings.cash_fee_currency) {
      return price.id;
    }
  }
  const price = await stripe().prices.create({
    currency: settings.cash_fee_currency,
    unit_amount: settings.cash_fee_amount,
    recurring: { interval: "month" },
    product_data: { name: "TrueRep · cuota por cliente en efectivo" },
  });
  await db.platformSettings.update({ where: { id: 1 }, data: { cash_fee_stripe_price_id: price.id } });
  return price.id;
}

/** Cuenta v2 del entrenador con la configuración de cliente (para pagar a TrueRep). */
async function ensureCustomerAccount(trainer: {
  id: string;
  email: string;
  username: string;
  stripe_account_id: string | null;
}): Promise<string> {
  if (trainer.stripe_account_id) {
    // Añadir una configuración que ya tiene no cambia nada.
    await stripe().v2.core.accounts.update(trainer.stripe_account_id, { configuration: { customer: {} } });
    return trainer.stripe_account_id;
  }
  const account = await stripe().v2.core.accounts.create({
    contact_email: trainer.email,
    display_name: trainer.username,
    configuration: { customer: {} },
    metadata: { truerep_user_id: trainer.id },
  });
  const saved = await db.user.updateMany({
    where: { id: trainer.id, stripe_account_id: null },
    data: { stripe_account_id: account.id },
  });
  if (saved.count) return account.id;
  const current = (await db.user.findUniqueOrThrow({ where: { id: trainer.id } })).stripe_account_id!;
  return ensureCustomerAccount({ ...trainer, stripe_account_id: current });
}

/** Sincroniza después de responder: el entrenador no espera a Stripe, y un
 * fallo de Stripe no deshace lo que ya guardó (regla 7: se registra y la
 * próxima sincronización lo corrige, porque compara contra lo que hay). */
export function syncTrainerBillingLater(...trainerIds: string[]) {
  after(async () => {
    for (const id of new Set(trainerIds)) {
      try {
        await syncTrainerBilling(id);
      } catch (e) {
        console.error(`syncTrainerBilling failed for trainer ${id}:`, e);
      }
    }
  });
}
