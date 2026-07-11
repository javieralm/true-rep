import { ScrollView, Text, View, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useChallenge, useJoinChallenge } from "@/hooks/useChallenges";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LeaderboardRow } from "@/components/social/LeaderboardRow";
import { Button } from "@/components/ui/Button";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: challenge, isLoading } = useChallenge(id);
  const { data: leaderboard } = useLeaderboard(id);
  const join = useJoinChallenge(id);

  if (isLoading || !challenge) return <Text style={styles.loading}>Loading…</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>{challenge.title}</Text>
        <DifficultyBadge difficulty={challenge.difficulty} />
      </View>
      <Text style={styles.description}>{challenge.description}</Text>
      <Text style={styles.meta}>
        🏅 {challenge.xp_reward} XP · {challenge.participant_count ?? 0} participants · ends{" "}
        {new Date(challenge.ends_at).toLocaleDateString()}
      </Text>

      <Button
        title={join.isPending ? "Joining…" : "Join Challenge"}
        disabled={join.isPending}
        onPress={() =>
          join.mutate(undefined, {
            onError: (e) => Alert.alert("Could not join", e.message),
            onSuccess: () => Alert.alert("You're in! 💪"),
          })
        }
      />

      <Text style={styles.section}>Leaderboard</Text>
      {(leaderboard?.participants ?? []).map((row) => (
        <LeaderboardRow key={row.user_id} row={row} />
      ))}
      {leaderboard?.participants.length === 0 && (
        <Text style={styles.empty}>Be the first to join!</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.xl, textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  meta: { fontSize: 14, color: colors.textSecondary },
  section: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  empty: { color: colors.textMuted },
});
