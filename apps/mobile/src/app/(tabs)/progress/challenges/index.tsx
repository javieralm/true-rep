import { FlatList, Text, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useChallenges } from "@/hooks/useChallenges";
import { useRefresh } from "@/hooks/useRefresh";
import { PressableCard } from "@/components/ui/PressableCard";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function ChallengesScreen() {
  const router = useRouter();
  const { data: challenges, isLoading } = useChallenges();
  const { refreshing, onRefresh } = useRefresh();

  return (
    <View style={styles.container}>
      <FlatList
        data={challenges ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
        }
        renderItem={({ item }) => (
          <PressableCard
            onPress={() => router.push({ pathname: "/progress/challenges/[id]", params: { id: item.id } })}
            cardStyle={styles.card}
          >
            <View style={styles.row}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <DifficultyBadge difficulty={item.difficulty} />
            </View>
            <Text style={styles.meta}>
              {item.participant_count ?? 0} participando · {item.xp_reward} XP · termina el{" "}
              {new Date(item.ends_at).toLocaleDateString()}
            </Text>
          </PressableCard>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>Ahora mismo no hay retos activos.</Text>
          ) : (
            <Text style={styles.empty}>Cargando retos…</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typo.cardTitle, color: colors.textPrimary, flex: 1 },
  meta: { ...typo.meta, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { ...typo.body, textAlign: "center", color: colors.textMuted, marginTop: spacing.xxl },
});
