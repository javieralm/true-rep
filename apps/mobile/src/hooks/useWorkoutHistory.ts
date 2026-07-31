import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workout } from "@truerep/shared";

/** Historial de workouts del usuario (incluye feedback del coach) */
export function useWorkoutHistory(limit = 10) {
  return useQuery({
    queryKey: ["workout-history", limit],
    queryFn: () => api<Workout[]>(`/workouts?limit=${limit}`),
  });
}
