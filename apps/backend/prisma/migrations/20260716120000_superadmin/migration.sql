-- Superadmin: único rol capaz de promover usuarios a TRAINER desde /admin/trainers
ALTER TABLE "users" ADD COLUMN "is_superadmin" BOOLEAN NOT NULL DEFAULT false;
