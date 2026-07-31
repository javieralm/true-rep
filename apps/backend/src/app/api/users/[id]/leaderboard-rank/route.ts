import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, username: true, xp: true } });
  if (!user) return fail("User not found", 404);
  const ahead = await db.user.count({ where: { xp: { gt: user.xp } } });
  return ok({ user_id: user.id, username: user.username, xp: user.xp, rank: ahead + 1 });
});
