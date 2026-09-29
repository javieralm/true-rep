-- Ejercicios posturales e isométricos (L-sit, plancha) se cuentan por segundos,
-- no por repeticiones. Todo lo que ya existe sigue siendo por repeticiones.
CREATE TYPE "ExerciseMeasure" AS ENUM ('reps', 'seconds');
ALTER TABLE "exercises" ADD COLUMN "measure" "ExerciseMeasure" NOT NULL DEFAULT 'reps';
