import Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import { db } from "@/lib/db";
import type { PriceInterval } from "@prisma/client";

let client: Stripe | null = null;

/** Cliente de Stripe perezoso: se construye en la primera petición, no al
 * importar el módulo. Instanciarlo al cargar rompía `next build` — Next importa
 * cada ruta para recolectar sus metadatos y el SDK de Stripe lanza si no hay
 * apiKey, así que compilar exigía tener los secretos de producción a mano. */
export function stripe(): Stripe {
  // Sin apiVersion: la que fija el SDK (2026-08-26.dahlia en stripe@22).
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return client;
}

/** Stripe no tiene "trimestral": es mensual cada 3 meses. */
export const RECURRING: Record<PriceInterval, { interval: "month" | "year"; interval_count: number }> = {
  MONTH: { interval: "month", interval_count: 1 },
  QUARTER: { interval: "month", interval_count: 3 },
  YEAR: { interval: "year", interval_count: 1 },
};

/** "Puede cobrar" en Accounts v2: la capacidad de tarjeta del perfil de comercio. */
export async function accountCanCharge(accountId: string): Promise<boolean> {
  const account = await stripe().v2.core.accounts.retrieve(accountId, { include: ["configuration.merchant"] });
  return account.configuration?.merchant?.capabilities?.card_payments?.status === "active";
}

/** "Puede cobrar" guardado en la base de datos; si aún no consta, lo relee en
 * Stripe (el entrenador puede haber terminado el alta sin volver a "Cobros"). */
export async function trainerCanCharge(trainer: {
  id: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
}): Promise<boolean> {
  if (!trainer.stripe_account_id) return false;
  if (trainer.stripe_charges_enabled) return true;
  const canCharge = await accountCanCharge(trainer.stripe_account_id);
  if (canCharge) await db.user.update({ where: { id: trainer.id }, data: { stripe_charges_enabled: true } });
  return canCharge;
}
