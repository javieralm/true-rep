import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { calcXp, nextStreak, checkAchievements } from "@/lib/gamification";
import { logWorkoutSchema } from "@truerep/shared";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, logWorkoutSchema);

  const routine = await db.routine.findFirst({
    where: { id: input.routine_id, deleted_at: null },
  });
  if (!routine) return fail("Routine not found", 404);

  const now = new Date();
  const streak = nextStreak(user.streak, user.streak_last_workout_date, now);
  const xpEarned = calcXp(input.duration_minutes, streak);

  const [workout, updatedUser] = await db.$transaction([
    db.workout.create({
      data: {
        user_id: user.id,
        routine_id: input.routine_id,
        completed_at: now,
        duration_minutes: input.duration_minutes,
        exercises_completed: input.exercises_completed,
        xp_earned: xpEarned,
        notes: input.notes,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { xp: { increment: xpEarned }, streak, streak_last_workout_date: now },
    }),
  ]);

  const unlockedAchievements = await checkAchievements(updatedUser);

  // Marcar retos activos de esta rutina como completados
  await db.challengeParticipant.updateMany({
    where: {
      user_id: user.id,
      completed_at: null,
      challenge: { routine_id: input.routine_id, starts_at: { lte: now }, ends_at: { gte: now } },
    },
    data: { completed_at: now },
  });

  return ok(
    {
      ...workout,
      user: { xp: updatedUser.xp, streak: updatedUser.streak },
      unlocked_achievements: unlockedAchievements,
    },
    201
  );
});
