import { db } from "@/lib/db";
import type { User } from "@prisma/client";

/** XP base 10 + bonus por duración + multiplicador de racha */
export function calcXp(durationMinutes: number, streak: number): number {
  const base = 10;
  const durationBonus = Math.min(Math.floor(durationMinutes / 10) * 5, 40);
  const streakMultiplier = 1 + Math.min(streak, 10) * 0.05; // cap +50%
  return Math.round((base + durationBonus) * streakMultiplier);
}

/** Racha: +1 si el último workout fue ayer, igual si fue hoy, 1 si se rompió */
export function nextStreak(current: number, lastWorkoutDate: Date | null, now = new Date()): number {
  if (!lastWorkoutDate) return 1;
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const diff = day(now) - day(lastWorkoutDate);
  if (diff === 0) return current || 1;
  if (diff === 1) return current + 1;
  return 1;
}

/** Comprueba condiciones de logros y crea UserAchievement; devuelve los recién desbloqueados */
export async function checkAchievements(user: User): Promise<string[]> {
  const conditions: string[] = [];
  const workoutCount = await db.workout.count({ where: { user_id: user.id } });

  if (workoutCount >= 1) conditions.push("FIRST_WORKOUT", "COMPLETE_ROUTINE");
  if (user.streak >= 7) conditions.push("STREAK_7");
  if (user.streak >= 30) conditions.push("STREAK_30");
  if (user.xp >= 100) conditions.push("XP_100");
  if (user.xp >= 500) conditions.push("XP_500");

  if (conditions.length === 0) return [];

  const achievements = await db.achievement.findMany({
    where: {
      unlock_condition: { in: conditions as never[] },
      user_achievements: { none: { user_id: user.id } },
    },
  });

  await db.userAchievement.createMany({
    data: achievements.map((a) => ({ user_id: user.id, achievement_id: a.id })),
    skipDuplicates: true,
  });

  return achievements.map((a) => a.name);
}
