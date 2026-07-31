import Stripe from "stripe";
import type { SubscriptionPlan } from "@truerep/shared";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
});

export const PLAN_PRICES = {
  base: process.env.STRIPE_PRICE_BASE ?? "",
  premium: process.env.STRIPE_PRICE_PREMIUM ?? "",
} as const;

/** Resuelve el tier a partir del price id de Stripe (webhook de upgrades/downgrades) */
export function priceToPlan(priceId: string | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === PLAN_PRICES.premium) return "PREMIUM";
  if (priceId === PLAN_PRICES.base) return "BASE";
  return null;
}
