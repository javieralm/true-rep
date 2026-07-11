import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Achievement } from "@truerep/shared";

export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => api<Achievement[]>(`/users/${userId}/achievements`),
    enabled: !!userId,
  });
}
