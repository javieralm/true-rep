import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { sendPushNotifications } from "@/lib/expo-push";
import { workoutFeedbackSchema } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

/** El coach comenta un workout de su cliente. Notifica por push. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const trainer = await requireTrainer();

  const workout = await db.workout.findUnique({
    where: { id },
    select: { id: true, user_id: true },
  });
  if (!workout) return fail("Workout not found", 404);

  // Solo si el usuario es cliente suyo (assignment activo de un programa del trainer)
  const isClient = await db.programAssignment.findFirst({
    where: {
      user_id: workout.user_id,
      is_active: true,
      program: { trainer_id: trainer.id, deleted_at: null },
    },
    select: { id: true },
  });
  if (!isClient) return fail("Not your client", 403);

  const { feedback } = await parseBody(req, workoutFeedbackSchema);
  const updated = await db.workout.update({
    where: { id },
    data: { trainer_feedback: feedback, feedback_at: new Date() },
  });

  // Push al cliente (best-effort)
  const tokens = await db.pushToken.findMany({
    where: { user_id: workout.user_id, is_active: true },
    select: { token: true },
  });
  if (tokens.length) {
    const invalid = await sendPushNotifications(
      tokens.map((t) => ({
        to: t.token,
        title: "Tu coach comentó tu entreno 👀",
        body: feedback.slice(0, 100),
        data: { type: "trainer_feedback", workout_id: id },
      }))
    );
    if (invalid.length) {
      await db.pushToken.updateMany({ where: { token: { in: invalid } }, data: { is_active: false } });
    }
  }

  return ok({ id: updated.id, trainer_feedback: updated.trainer_feedback, feedback_at: updated.feedback_at });
});
