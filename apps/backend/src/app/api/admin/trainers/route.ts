import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";

/** Lista de usuarios para el panel de administración: promover/degradar
 * trainers y, de los trainers, sus clientes activos y su comisión. */
export const GET = handler(async () => {
  await requireSuperadmin();
  const users = await db.user.findMany({
    orderBy: [{ role: "desc" }, { created_at: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      is_superadmin: true,
      created_at: true,
      trainer_requested_at: true,
      trainer_application_note: true,
      stripe_charges_enabled: true,
      commission_percent_override: true,
      commission_percent_applied: true,
    },
  });
  const counts = await db.trainerClient.groupBy({
    by: ["trainer_id", "billing"],
    where: { status: "ACTIVE" },
    _count: true,
  });
  const count = (id: string, billing: "CASH" | "STRIPE") =>
    counts.find((c) => c.trainer_id === id && c.billing === billing)?._count ?? 0;

  return ok(
    users.map((u) => ({
      ...u,
      commission_percent_override: u.commission_percent_override == null ? null : Number(u.commission_percent_override),
      commission_percent_applied: u.commission_percent_applied == null ? null : Number(u.commission_percent_applied),
      active_stripe_clients: count(u.id, "STRIPE"),
      active_cash_clients: count(u.id, "CASH"),
    }))
  );
});
