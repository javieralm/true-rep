import { create } from "zustand";
import type { Routine, ExerciseCompleted } from "@truerep/shared";

interface WorkoutState {
  activeRoutine: Routine | null;
  startedAt: number | null;
  completed: ExerciseCompleted[];
  start: (routine: Routine) => void;
  toggleExercise: (exerciseId: string, feltLike?: ExerciseCompleted["felt_like"]) => void;
  setWeight: (exerciseId: string, weightKg: number | undefined) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeRoutine: null,
  startedAt: null,
  completed: [],
  start: (routine) => set({ activeRoutine: routine, startedAt: Date.now(), completed: [] }),
  toggleExercise: (exerciseId, feltLike = "medium") => {
    const { completed } = get();
    const exists = completed.some((c) => c.exercise_id === exerciseId);
    set({
      completed: exists
        ? completed.filter((c) => c.exercise_id !== exerciseId)
        : [...completed, { exercise_id: exerciseId, reps_done: 1, felt_like: feltLike }],
    });
  },
  setWeight: (exerciseId, weightKg) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId ? { ...c, weight_kg: weightKg } : c
      ),
    });
  },
  reset: () => set({ activeRoutine: null, startedAt: null, completed: [] }),
}));
