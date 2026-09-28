import Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import type { SubscriptionPlan } from "@truerep/shared";

let client: Stripe | null = null;

/** Cliente de Stripe perezoso: se construye en la primera petición, no al
 * importar el módulo. Instanciarlo al cargar rompía `next build` — Next importa
 * cada ruta para recolectar sus metadatos y el SDK de Stripe lanza si no hay
 * apiKey, así que compilar exigía tener los secretos de producción a mano. */
export function stripe(): Stripe {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
  });
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
