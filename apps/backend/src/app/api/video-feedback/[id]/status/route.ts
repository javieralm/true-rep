import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser();
  const feedback = await db.videoFeedback.findFirst({ where: { id, user_id: user.id } });
  if (!feedback) return fail("Feedback not found", 404);
  return ok({
    id: feedback.id,
    status: feedback.analysis_status.toLowerCase(),
    feedback_text: feedback.feedback_text,
    analyzed_at: feedback.analyzed_at,
  });
});
