-- Push notifications: tokens Expo + preferencias de recordatorio

ALTER TABLE "users"
  ADD COLUMN "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reminder_hour" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN "last_reminder_sent_at" TIMESTAMP(3);

CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX "push_tokens_user_id_is_active_idx" ON "push_tokens"("user_id", "is_active");

ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
