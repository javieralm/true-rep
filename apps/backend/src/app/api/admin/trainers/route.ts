import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";

/** Lista de usuarios para el panel de administración (promover/degradar trainers) */
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
    },
  });
  return ok(users);
});
