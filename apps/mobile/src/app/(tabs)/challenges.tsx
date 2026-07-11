import { FlatList, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useChallenges } from "@/hooks/useChallenges";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";

export default function ChallengesScreen() {
  const router = useRouter();
  const { data: challenges, isLoading } = useChallenges();

  return (
    <View style={styles.container}>
      <FlatList
        data={challenges ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/challenge-detail", params: { id: item.id } })}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <DifficultyBadge difficulty={item.difficulty} />
              </View>
              <Text style={styles.meta}>
                {item.participant_count ?? 0} joined · {item.xp_reward} XP · ends{" "}
                {new Date(item.ends_at).toLocaleDateString()}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No active challenges right now.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  meta: { marginTop: spacing.xs, fontSize: 13, color: colors.textSecondary },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xxl },
});
