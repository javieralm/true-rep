import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
});

export const PLAN_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  annual: process.env.STRIPE_PRICE_ANNUAL ?? "",
} as const;
