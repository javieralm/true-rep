import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
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
