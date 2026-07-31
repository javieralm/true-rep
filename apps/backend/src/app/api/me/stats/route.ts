import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireActiveSubscription } from "@/lib/auth";
import type { ExerciseCompleted, Exercise } from "@truerep/shared";

const WEEKS = 12;

/** Estadísticas de progreso. Base: semanas + totales. Premium: además pesos por ejercicio. */
export const GET = handler(async () => {
  const user = await requireActiveSubscription();

  const since = new Date(Date.now() - WEEKS * 7 * 86_400_000);
  const workouts = await db.workout.findMany({
    where: { user_id: user.id, completed_at: { gte: since } },
    select: { completed_at: true, exercises_completed: true, routine_id: true, xp_earned: true },
    orderBy: { completed_at: "asc" },
  });

  // Buckets semanales (semana 0 = la más antigua, 11 = la actual)
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({
    week_start: new Date(since.getTime() + i * 7 * 86_400_000).toISOString(),
    workouts: 0,
    reps: 0,
  }));
  let totalReps = 0;

  for (const w of workouts) {
    const idx = Math.min(
      WEEKS - 1,
      Math.floor((w.completed_at.getTime() - since.getTime()) / (7 * 86_400_000))
    );
    const reps = (w.exercises_completed as unknown as ExerciseCompleted[]).reduce(
      (sum, e) => sum + e.reps_done,
      0
    );
    weekly[idx].workouts += 1;
    weekly[idx].reps += reps;
    totalReps += reps;
  }

  // Estadísticas avanzadas (Premium): progresión de pesos por ejercicio
  type WeightSeries = {
    exercise_id: string;
    exercise_name: string;
    entries: Array<{ date: string; weight_kg: number; reps_done: number }>;
  };
  let weights: WeightSeries[] | null = null;

  if (user.subscription_plan === "PREMIUM") {
    const routineIds = [...new Set(workouts.map((w) => w.routine_id))];
    const routines = await db.routine.findMany({
      where: { id: { in: routineIds } },
      select: { exercises: true },
    });
    const names = new Map<string, string>();
    for (const r of routines) {
      for (const ex of r.exercises as unknown as Exercise[]) {
        // El log guarda ex.id del Json de la rutina; exercise_id (librería) como alias
        names.set(ex.id, ex.name);
        if (ex.exercise_id) names.set(ex.exercise_id, ex.name);
      }
    }

    const byExercise = new Map<string, WeightSeries>();
    for (const w of workouts) {
      for (const e of w.exercises_completed as unknown as ExerciseCompleted[]) {
        if (e.weight_kg == null) continue;
        const entry = byExercise.get(e.exercise_id) ?? {
          exercise_id: e.exercise_id,
          exercise_name: names.get(e.exercise_id) ?? e.exercise_id,
          entries: [],
        };
        entry.entries.push({
          date: w.completed_at.toISOString(),
          weight_kg: e.weight_kg,
          reps_done: e.reps_done,
        });
        byExercise.set(e.exercise_id, entry);
      }
    }
    weights = [...byExercise.values()];
  }

  return ok({
    totals: {
      workouts: workouts.length,
      reps: totalReps,
      xp: user.xp,
      streak: user.streak,
    },
    weekly,
    weights, // null si no es Premium
  });
});
