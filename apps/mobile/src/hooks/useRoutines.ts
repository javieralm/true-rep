import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Routine, Difficulty } from "@truerep/shared";

export function useRoutines(difficulty?: Difficulty) {
  const qs = difficulty ? `?difficulty=${difficulty}` : "";
  return useQuery({
    queryKey: ["routines", difficulty ?? "all"],
    queryFn: () => api<Routine[]>(`/routines${qs}`),
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: ["routine", id],
    queryFn: () => api<Routine>(`/routines/${id}`),
    enabled: !!id,
  });
}
