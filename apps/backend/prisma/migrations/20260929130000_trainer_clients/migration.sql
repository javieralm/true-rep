-- Acceso por invitación: cada cliente pertenece a un entrenador, que le invita
-- por email y decide si cobra por Stripe o en efectivo.
CREATE TYPE "ClientStatus" AS ENUM ('INVITED', 'ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "BillingMode" AS ENUM ('STRIPE', 'CASH');

CREATE TABLE "trainer_clients" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "client_id" TEXT,
    "email" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'INVITED',
    "billing" "BillingMode" NOT NULL DEFAULT 'CASH',
    "paid_until" TIMESTAMP(3),
    "clerk_invitation_id" TEXT,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trainer_clients_trainer_id_email_key" ON "trainer_clients"("trainer_id", "email");
CREATE INDEX "trainer_clients_email_idx" ON "trainer_clients"("email");
CREATE INDEX "trainer_clients_client_id_idx" ON "trainer_clients"("client_id");

ALTER TABLE "trainer_clients" ADD CONSTRAINT "trainer_clients_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trainer_clients" ADD CONSTRAINT "trainer_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Los clientes de hoy (programa asignado y activo) pasan a ser clientes de ese
-- entrenador, con el mismo acceso que tenían: pagaban por Stripe. Si alguien
-- tuviera programas de dos entrenadores, se queda con el más reciente.
INSERT INTO "trainer_clients" ("id", "trainer_id", "client_id", "email", "status", "billing", "accepted_at", "updated_at")
SELECT DISTINCT ON (pa."user_id")
    'tc_' || pa."id",
    p."trainer_id",
    pa."user_id",
    lower(u."email"),
    'ACTIVE',
    'STRIPE',
    pa."created_at",
    CURRENT_TIMESTAMP
FROM "program_assignments" pa
JOIN "programs" p ON p."id" = pa."program_id"
JOIN "users" u ON u."id" = pa."user_id"
WHERE pa."is_active" = true
ORDER BY pa."user_id", pa."created_at" DESC;
