import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireSuperadmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

const setRoleSchema = z.object({ role: z.enum(["USER", "TRAINER"]) });

/** Promueve o degrada un usuario a/desde TRAINER (solo superadmin) */
export const PATCH = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const admin = await requireSuperadmin();
  if (id === admin.id) return fail("No puedes cambiar tu propio rol", 400);

  const { role } = await parseBody(req, setRoleSchema);
  const target = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return fail("User not found", 404);

  const updated = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, username: true, email: true, role: true },
  });
  return ok(updated);
});
