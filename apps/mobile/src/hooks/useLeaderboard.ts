import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSupabase } from "@/services/supabase";
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
    // Sin Supabase configurado no hay tiempo real, pero el leaderboard sigue
    // funcionando: los datos vienen de la API, esto solo refresca en vivo.
    const supabase = getSupabase();
    if (!supabase) return;

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
