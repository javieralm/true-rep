-- Librería de ejercicios + programas semanales del trainer

CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT,
    "equipment" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_items" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "routine_id" TEXT NOT NULL,

    CONSTRAINT "program_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_assignments" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exercises_trainer_id_name_idx" ON "exercises"("trainer_id", "name");
CREATE INDEX "programs_trainer_id_idx" ON "programs"("trainer_id");
CREATE INDEX "program_items_program_id_week_day_idx" ON "program_items"("program_id", "week", "day");
CREATE UNIQUE INDEX "program_assignments_user_id_program_id_key" ON "program_assignments"("user_id", "program_id");
CREATE INDEX "program_assignments_user_id_is_active_idx" ON "program_assignments"("user_id", "is_active");

ALTER TABLE "exercises" ADD CONSTRAINT "exercises_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "programs" ADD CONSTRAINT "programs_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_items" ADD CONSTRAINT "program_items_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_items" ADD CONSTRAINT "program_items_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
