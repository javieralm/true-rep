import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Challenge } from "@truerep/shared";

export function useChallenges() {
  return useQuery({ queryKey: ["challenges"], queryFn: () => api<Challenge[]>("/challenges") });
}

export function useChallenge(id: string) {
  return useQuery({
    queryKey: ["challenge", id],
    queryFn: () => api<Challenge>(`/challenges/${id}`),
    enabled: !!id,
  });
}

export function useJoinChallenge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/challenges/${id}/join`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge", id] });
      qc.invalidateQueries({ queryKey: ["leaderboard", id] });
    },
  });
}
