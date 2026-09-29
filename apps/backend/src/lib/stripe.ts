import Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import type { SubscriptionPlan } from "@truerep/shared";
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

export function planPrices() {
  return {
    base: requireEnv("STRIPE_PRICE_BASE"),
    premium: requireEnv("STRIPE_PRICE_PREMIUM"),
  } as const;
}

/** Resuelve el tier a partir del price id de Stripe (webhook de upgrades/downgrades) */
export function priceToPlan(priceId: string | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  const prices = planPrices();
  if (priceId === prices.premium) return "PREMIUM";
  if (priceId === prices.base) return "BASE";
  return null;
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
