-- Tiers de suscripción: el plan pasa de periodicidad (MONTHLY/ANNUAL) a nivel (BASE/PREMIUM)
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASE', 'PREMIUM');

ALTER TABLE "users"
  ALTER COLUMN "subscription_plan" TYPE "SubscriptionPlan"
  USING (
    CASE "subscription_plan"::text
      WHEN 'MONTHLY' THEN 'BASE'
      WHEN 'ANNUAL' THEN 'PREMIUM'
    END::"SubscriptionPlan"
  );

DROP TYPE "SubscriptionPlan_old";
