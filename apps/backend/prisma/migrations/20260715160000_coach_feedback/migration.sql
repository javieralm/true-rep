-- Fase 5: feedback del coach sobre un workout
ALTER TABLE "workouts"
  ADD COLUMN "trainer_feedback" TEXT,
  ADD COLUMN "feedback_at" TIMESTAMP(3);
