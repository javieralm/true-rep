-- Fase B2: suscripción del cliente a su entrenador (Stripe Connect, direct charges).
ALTER TABLE "trainer_clients" ADD COLUMN     "current_period_end" TIMESTAMP(3),
ADD COLUMN     "price_id" TEXT,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_status" TEXT;

CREATE UNIQUE INDEX "trainer_clients_stripe_subscription_id_key" ON "trainer_clients"("stripe_subscription_id");

