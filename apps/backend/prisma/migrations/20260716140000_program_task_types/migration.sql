-- Tipos de tarea en el programador: Workout ya existía; añadimos Mensaje, Vídeo, Nota y Sesión
CREATE TYPE "ProgramItemType" AS ENUM ('ROUTINE', 'MESSAGE', 'VIDEO', 'NOTE', 'SESSION');

ALTER TABLE "program_items" ADD COLUMN "type" "ProgramItemType" NOT NULL DEFAULT 'ROUTINE';
ALTER TABLE "program_items" ADD COLUMN "data" JSONB;

-- routine_id solo lo usan las tareas ROUTINE
ALTER TABLE "program_items" ALTER COLUMN "routine_id" DROP NOT NULL;
