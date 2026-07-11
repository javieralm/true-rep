import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { paginationSchema } from "@truerep/shared";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const { limit, offset } = paginationSchema.parse(Object.fromEntries(url.searchParams));

  const workouts = await db.workout.findMany({
    where: { user_id: user.id },
    include: { routine: { select: { id: true, title: true, difficulty: true } } },
    orderBy: { completed_at: "desc" },
    take: limit,
    skip: offset,
  });
  return ok(workouts);
});
