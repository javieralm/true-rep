import { after } from "next/server";
import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requirePremium } from "@/lib/auth";
import { keyframeUrls } from "@/lib/cloudinary";
import { analyzeForm } from "@/lib/openai";
import { analyzeVideoSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requirePremium();

  const input = await parseBody(req, analyzeVideoSchema);

  const feedback = await db.videoFeedback.create({
    data: {
      user_id: user.id,
      exercise_name: input.exercise_name,
      video_url: input.video_url,
      analysis_status: "PENDING",
    },
  });

  // ponytail: análisis en after() del mismo request; mover a cola (QStash/Inngest)
  // si el volumen supera los límites de tiempo de Vercel
  after(async () => {
    try {
      const frames = keyframeUrls(input.video_url);
      const text = await analyzeForm(input.exercise_name, frames);
      await db.videoFeedback.update({
        where: { id: feedback.id },
        data: { analysis_status: "COMPLETED", feedback_text: text, analyzed_at: new Date() },
      });
    } catch (e) {
      console.error("Vision analysis failed:", e);
      await db.videoFeedback.update({
        where: { id: feedback.id },
        data: { analysis_status: "FAILED" },
      });
    }
  });

  return ok({ feedback_id: feedback.id, status: "pending", created_at: feedback.created_at }, 202);
});
