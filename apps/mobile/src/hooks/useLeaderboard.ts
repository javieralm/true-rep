import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/services/supabase";
import type { LeaderboardRow } from "@truerep/shared";

interface ChallengeLeaderboard {
  challenge_id: string;
  title: string;
  participants: LeaderboardRow[];
}

/** Leaderboard de reto con actualización en tiempo real vía Supabase */
export function useLeaderboard(challengeId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["leaderboard", challengeId],
    queryFn: () => api<ChallengeLeaderboard>(`/challenges/${challengeId}/leaderboard`),
    enabled: !!challengeId,
  });

  useEffect(() => {
    if (!challengeId) return;
    const channel = supabase
      .channel(`challenge:${challengeId}:leaderboard`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_participants", filter: `challenge_id=eq.${challengeId}` },
        () => qc.invalidateQueries({ queryKey: ["leaderboard", challengeId] })
      )
      .subscribe();
    // Regla crítica #5: desuscribirse en cleanup para evitar fugas
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, qc]);

  return query;
}

/** Leaderboard global (top 100 por XP) */
export function useGlobalLeaderboard() {
  return useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: () => api<LeaderboardRow[]>("/users/leaderboard"),
  });
}
