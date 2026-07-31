import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";

/** Suscriptores Premium activos — selector de asignación de programas */
export const GET = handler(async () => {
  await requireTrainer();
  const users = await db.user.findMany({
    where: { subscription_status: "ACTIVE", subscription_plan: "PREMIUM", role: "USER" },
    select: { id: true, username: true, email: true, avatar_url: true },
    orderBy: { username: "asc" },
  });
  return ok(users);
});
