import { after } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { runVideoAnalysis } from "@/lib/video-feedback";

type Params = { params: Promise<{ id: string }> };

/** Un trainer aprueba un video pendiente de revisión y dispara el análisis
 * de OpenAI Vision. Gate manual (CEO review, 2026-07-31): el pipeline no se
 * automatiza hasta validar que el feedback genera valor real. */
export const POST = handler(async (_req: Request, { params }: Params) => {
  await requireTrainer();
  const { id } = await params;

  const feedback = await db.videoFeedback.findUnique({ where: { id } });
  if (!feedback) return fail("Feedback not found", 404);
  if (feedback.analysis_status !== "PENDING_TRAINER_REVIEW") {
    return fail(`Feedback is not pending review (status: ${feedback.analysis_status})`, 409);
  }

  await db.videoFeedback.update({ where: { id }, data: { analysis_status: "PENDING" } });
  // ponytail: análisis en after() del mismo request, igual que el flujo
  // automático original; mover a una cola (QStash/Inngest) si el volumen
  // supera los límites de tiempo de Vercel. El cliente sigue el estado vía
  // GET /video-feedback/[id]/status.
  after(() => runVideoAnalysis(feedback.id, feedback.video_url, feedback.exercise_name));

  return ok({ feedback_id: feedback.id, status: "pending" });
});
