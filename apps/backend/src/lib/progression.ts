import type { ExerciseCompleted, WeightSuggestion } from "@truerep/shared";

const WEIGHT_SUGGESTION_INCREMENT_KG = 1;

type WorkoutLog = { completed_at: Date; exercises_completed: ExerciseCompleted[] };

/** Auto-escalado simple: mira el registro de peso más reciente de cada
 * ejercicio pedido; si se sintió "easy", sugiere +1kg. Es una sugerencia que
 * el cliente ve y decide usar o no — no se aplica sola. */
export function computeWeightSuggestions(
  recentWorkouts: WorkoutLog[],
  exerciseIds: string[]
): WeightSuggestion[] {
  const wanted = new Set(exerciseIds);
  const latest = new Map<string, { completed_at: Date; entry: ExerciseCompleted }>();

  for (const w of recentWorkouts) {
    for (const entry of w.exercises_completed) {
      if (!wanted.has(entry.exercise_id) || entry.weight_kg == null) continue;
      const current = latest.get(entry.exercise_id);
      if (!current || w.completed_at > current.completed_at) {
        latest.set(entry.exercise_id, { completed_at: w.completed_at, entry });
      }
    }
  }

  const suggestions: WeightSuggestion[] = [];
  for (const [exercise_id, { entry }] of latest) {
    if (entry.felt_like !== "easy") continue;
    suggestions.push({
      exercise_id,
      last_weight_kg: entry.weight_kg!,
      last_felt_like: entry.felt_like,
      suggested_weight_kg: entry.weight_kg! + WEIGHT_SUGGESTION_INCREMENT_KG,
    });
  }
  return suggestions;
}
