import { db } from "@/lib/db";
import { keyframeUrls } from "@/lib/cloudinary";
import { analyzeForm } from "@/lib/openai";

/** Corre el análisis de OpenAI Vision para un VideoFeedback ya aprobado por
 * un trainer y persiste el resultado (o el fallo). Compartido entre la ruta
 * que dispara el análisis (`/review`) y, si algún día se automatiza de
 * nuevo, cualquier otro trigger. */
export async function runVideoAnalysis(feedbackId: string, videoUrl: string, exerciseName: string): Promise<void> {
  try {
    const frames = keyframeUrls(videoUrl);
    const text = await analyzeForm(exerciseName, frames);
    await db.videoFeedback.update({
      where: { id: feedbackId },
      data: { analysis_status: "COMPLETED", feedback_text: text, analyzed_at: new Date() },
    });
  } catch (e) {
    console.error(`Vision analysis failed for feedback ${feedbackId}:`, e);
    await db.videoFeedback.update({
      where: { id: feedbackId },
      data: { analysis_status: "FAILED" },
    });
  }
}
