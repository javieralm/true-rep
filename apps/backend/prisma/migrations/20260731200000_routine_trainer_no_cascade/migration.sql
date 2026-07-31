-- Un trainer eliminado NUNCA debe arrastrar en cascada el historial de
-- workouts de sus suscriptores. Restrict en vez de Cascade: la app debe
-- anonimizar al trainer (no borrarlo) mientras tenga rutinas — ver el
-- webhook de Clerk (user.deleted) en apps/backend/src/app/api/webhooks/clerk/route.ts.
ALTER TABLE "routines" DROP CONSTRAINT "routines_trainer_id_fkey";
ALTER TABLE "routines" ADD CONSTRAINT "routines_trainer_id_fkey"
  FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
