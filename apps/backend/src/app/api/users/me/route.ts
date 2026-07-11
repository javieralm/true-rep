import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema } from "@truerep/shared";

export const GET = handler(async () => {
  const user = await requireUser();
  const { clerk_id: _clerkId, subscription_id: _subId, ...safe } = user;
  return ok(safe);
});

export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, updateProfileSchema);
  const updated = await db.user.update({ where: { id: user.id }, data: input });
  const { clerk_id: _clerkId, subscription_id: _subId, ...safe } = updated;
  return ok(safe);
});
