import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/hooks/useUser";
import { useRoutines } from "@/hooks/useRoutines";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { Card } from "@/components/ui/Card";
import { colors, spacing } from "@/constants/colors";

export default function Dashboard() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: routines } = useRoutines();
  const recommended = routines?.[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.greeting}>Hey {user?.username ?? "athlete"} 👋</Text>

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{user?.xp ?? 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>🔥 {user?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{Math.floor((user?.xp ?? 0) / 100) + 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </Card>
      </View>

      <Text style={styles.section}>Today&apos;s Recommendation</Text>
      {recommended ? (
        <RoutineCard
          routine={recommended}
          onPress={() => router.push({ pathname: "/routine-detail", params: { id: recommended.id } })}
        />
      ) : (
        <Text style={styles.empty}>No routines available yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  section: { fontSize: 18, fontWeight: "600", marginBottom: spacing.md, color: colors.textPrimary },
  empty: { color: colors.textMuted },
});
