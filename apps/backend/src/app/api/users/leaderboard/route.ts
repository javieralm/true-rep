import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";

export const GET = handler(async () => {
  const top = await db.user.findMany({
    orderBy: { xp: "desc" },
    take: 100,
    select: { id: true, username: true, avatar_url: true, xp: true, streak: true },
  });
  return ok(top.map((u, i) => ({ rank: i + 1, user_id: u.id, ...u })));
});
