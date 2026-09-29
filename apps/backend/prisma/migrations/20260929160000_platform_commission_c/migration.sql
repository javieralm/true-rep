-- Fase C: comisión por tramos editable y cuota por cliente en efectivo.
ALTER TABLE "users" ADD COLUMN     "cash_fee_subscription_id" TEXT,
ADD COLUMN     "commission_percent_applied" DECIMAL(5,2);

CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "commission_tiers" JSONB NOT NULL,
    "cash_fee_amount" INTEGER NOT NULL DEFAULT 200,
    "cash_fee_currency" TEXT NOT NULL DEFAULT 'eur',
    "cash_fee_stripe_price_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_cash_fee_subscription_id_key" ON "users"("cash_fee_subscription_id");


-- Tramos por defecto: 10 % (1–10 clientes activos), 8 % (11–30), 6 % (31+).
INSERT INTO "platform_settings" ("id", "commission_tiers", "updated_at") VALUES (1, '[{"max":10,"pct":10},{"max":30,"pct":8},{"max":null,"pct":6}]', CURRENT_TIMESTAMP);
