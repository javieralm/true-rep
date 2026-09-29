import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { clientOf } from "@/lib/access";

/** Logros de un usuario: los suyos, o los de un cliente para su entrenador. */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  if (id !== user.id) {
    const isClient = user.role === "TRAINER" && (await db.user.count({ where: { id, ...clientOf(user.id) } })) > 0;
    if (!isClient) return fail("User not found", 404);
  }
  const [all, unlocked] = await Promise.all([
    db.achievement.findMany({ orderBy: { created_at: "asc" } }),
    db.userAchievement.findMany({ where: { user_id: id } }),
  ]);
  const unlockedMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));
  return ok(
    all.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon_url: a.icon_url,
      unlocked_at: unlockedMap.get(a.id) ?? null,
    }))
  );
});
