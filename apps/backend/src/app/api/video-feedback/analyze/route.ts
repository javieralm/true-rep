import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requirePremium } from "@/lib/auth";
import { analyzeVideoSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requirePremium();

  const input = await parseBody(req, analyzeVideoSchema);

  // Gate manual: el análisis de OpenAI Vision ya NO se dispara solo. Un
  // trainer tiene que aprobarlo vía POST /api/video-feedback/[id]/review
  // primero — es la pieza más cara y menos validada del producto (CEO
  // review, 2026-07-31), no se automatiza hasta confirmar que el feedback
  // manual ya genera valor real.
  const feedback = await db.videoFeedback.create({
    data: {
      user_id: user.id,
      exercise_name: input.exercise_name,
      video_url: input.video_url,
      analysis_status: "PENDING_TRAINER_REVIEW",
    },
  });

  return ok({ feedback_id: feedback.id, status: "pending_trainer_review", created_at: feedback.created_at }, 202);
});
