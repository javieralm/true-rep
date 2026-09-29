-- Fase B1: cuenta conectada de Stripe del entrenador y sus precios.
CREATE TYPE "PriceInterval" AS ENUM ('MONTH', 'QUARTER', 'YEAR');

ALTER TABLE "users" ADD COLUMN "stripe_account_id" TEXT,
ADD COLUMN "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripe_product_id" TEXT,
ADD COLUMN "commission_percent_override" DECIMAL(5,2);

CREATE UNIQUE INDEX "users_stripe_account_id_key" ON "users"("stripe_account_id");

CREATE TABLE "trainer_prices" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "interval" "PriceInterval" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trainer_prices_stripe_price_id_key" ON "trainer_prices"("stripe_price_id");
CREATE INDEX "trainer_prices_trainer_id_active_idx" ON "trainer_prices"("trainer_id", "active");

ALTER TABLE "trainer_prices" ADD CONSTRAINT "trainer_prices_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);
