import { ScrollView, Text, View, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useChallenge, useJoinChallenge } from "@/hooks/useChallenges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LeaderboardRow } from "@/components/social/LeaderboardRow";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: challenge, isLoading, error, refetch } = useChallenge(id);
  const { data: leaderboard } = useLeaderboard(id);
  const join = useJoinChallenge(id);

  if (isLoading) return <Text style={styles.loading}>Cargando…</Text>;
  if (error || !challenge) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>{challenge.title}</Text>
        <DifficultyBadge difficulty={challenge.difficulty} />
      </View>
      <Text style={styles.description}>{challenge.description}</Text>
      <Text style={styles.meta}>
        🏅 {challenge.xp_reward} XP · {challenge.participant_count ?? 0}{" "}
        {challenge.participant_count === 1 ? "participante" : "participantes"} · termina el{" "}
        {new Date(challenge.ends_at).toLocaleDateString()}
      </Text>

      <Button
        title={join.isPending ? "Apuntándote…" : "Apuntarme al reto"}
        disabled={join.isPending}
        onPress={() =>
          join.mutate(undefined, {
            onError: (e) => Alert.alert("No hemos podido apuntarte", e.message),
            onSuccess: () => Alert.alert("¡Estás dentro! 💪"),
          })
        }
      />

      <Text style={styles.section}>Clasificación</Text>
      {(leaderboard?.participants ?? []).map((row) => (
        <LeaderboardRow key={row.user_id} row={row} />
      ))}
      {leaderboard?.participants.length === 0 && (
        <Text style={styles.empty}>¡Sé el primero en apuntarte!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { ...typo.body, padding: spacing.xl, textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typo.title, color: colors.textPrimary, flex: 1 },
  description: { ...typo.body, color: colors.textSecondary },
  meta: { ...typo.meta, color: colors.textSecondary },
  section: { ...typo.section, color: colors.textPrimary },
  empty: { ...typo.body, color: colors.textMuted },
});
