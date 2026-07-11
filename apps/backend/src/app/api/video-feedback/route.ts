import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async () => {
  const user = await requireUser();
  const feedback = await db.videoFeedback.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });
  return ok(feedback);
});
