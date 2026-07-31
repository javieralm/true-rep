-- Idempotencia real para /api/workouts/log: el cliente (único: la app mobile
-- de este monorepo) siempre envía un UUID por intento de guardado.
ALTER TABLE "workouts" ADD COLUMN "idempotency_key" TEXT NOT NULL;
CREATE UNIQUE INDEX "workouts_user_id_idempotency_key_key" ON "workouts"("user_id", "idempotency_key");
