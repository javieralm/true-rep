-- Idempotencia real para /api/workouts/log: el cliente envía un UUID por
-- intento; NULL sigue siendo válido (clientes viejos) porque Postgres nunca
-- considera dos NULLs iguales para un constraint UNIQUE.
ALTER TABLE "workouts" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "workouts_user_id_idempotency_key_key" ON "workouts"("user_id", "idempotency_key");
