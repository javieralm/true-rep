-- Alta de entrenador desde la web: solicitud que aprueba el superadmin.
ALTER TABLE "users" ADD COLUMN     "trainer_application_note" TEXT,
ADD COLUMN     "trainer_requested_at" TIMESTAMP(3);

