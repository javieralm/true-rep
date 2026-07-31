-- Persistir el Stripe Customer para no fragmentar el historial de pago en resuscripciones
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT;

-- Índices de performance identificados en el /autoplan Eng review (2026-07-31):
-- lookup por subscription_id en el webhook de Stripe, y el update de
-- ChallengeParticipant en el hot path de workouts/log filtra por user_id primero.
CREATE INDEX "users_subscription_id_idx" ON "users"("subscription_id");
CREATE INDEX "challenge_participants_user_id_completed_at_idx" ON "challenge_participants"("user_id", "completed_at");
