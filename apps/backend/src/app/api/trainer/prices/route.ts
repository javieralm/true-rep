import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { stripe, RECURRING } from "@/lib/stripe";
import { trainerPricesSchema, type TrainerPriceRow } from "@truerep/shared";
import type { PriceInterval } from "@prisma/client";

const INTERVALS: PriceInterval[] = ["MONTH", "QUARTER", "YEAR"];

async function activePrices(trainerId: string): Promise<TrainerPriceRow[]> {
  const rows = await db.trainerPrice.findMany({
    where: { trainer_id: trainerId, active: true },
    select: { interval: true, amount: true, currency: true },
  });
  return rows.sort((a, b) => INTERVALS.indexOf(a.interval) - INTERVALS.indexOf(b.interval));
}

export const GET = handler(async () => {
  const trainer = await requireTrainer();
  return ok(await activePrices(trainer.id));
});

/** Guarda los precios del entrenador en su cuenta de Stripe. Un precio de
 * Stripe no se puede cambiar: si cambia el importe o la moneda se crea uno
 * nuevo y se archiva el anterior, y quien ya estaba suscrito sigue en el suyo.
 * Compara contra la base de datos, así que repetir la petición tras un fallo a
 * medias termina el trabajo sin duplicar precios. */
export const PUT = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const { currency, prices } = await parseBody(req, trainerPricesSchema);
  const stripeAccount = trainer.stripe_account_id;
  if (!stripeAccount) return fail("Conecta primero tu cuenta de Stripe", 409);

  try {
    let productId = trainer.stripe_product_id;
    if (!productId) {
      const product = await stripe().products.create(
        { name: `Entrenamiento con ${trainer.username}` },
        { stripeAccount }
      );
      productId = product.id;
      await db.user.update({ where: { id: trainer.id }, data: { stripe_product_id: productId } });
    }

    const current = await db.trainerPrice.findMany({ where: { trainer_id: trainer.id, active: true } });
    for (const interval of INTERVALS) {
      const amount = prices[interval] ?? null;
      const old = current.find((p) => p.interval === interval);
      if (old && old.amount === amount && old.currency === currency) continue;

      // Primero el nuevo y luego archivar el viejo: si algo falla entre medias,
      // el cliente nunca se queda sin precio que elegir.
      if (amount != null) {
        const price = await stripe().prices.create(
          { product: productId, currency, unit_amount: amount, recurring: RECURRING[interval] },
          { stripeAccount }
        );
        await db.trainerPrice.create({
          data: { trainer_id: trainer.id, interval, amount, currency, stripe_price_id: price.id },
        });
      }
      if (old) {
        await stripe().prices.update(old.stripe_price_id, { active: false }, { stripeAccount });
        await db.trainerPrice.update({ where: { id: old.id }, data: { active: false } });
      }
    }
  } catch (e) {
    console.error("Stripe prices error:", e);
    return fail("No se han podido guardar los precios en Stripe. Inténtalo de nuevo.", 502);
  }

  return ok(await activePrices(trainer.id));
});
