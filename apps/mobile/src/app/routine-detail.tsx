import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoutine } from "@/hooks/useRoutines";
import { useWorkoutStore } from "@/state/workoutStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: routine, isLoading } = useRoutine(id);
  const startWorkout = useWorkoutStore((s) => s.start);

  if (isLoading || !routine) return <Text style={styles.loading}>Loading…</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>{routine.title}</Text>
        <DifficultyBadge difficulty={routine.difficulty} />
      </View>
      <Text style={styles.description}>{routine.description}</Text>
      <Text style={styles.meta}>⏱ {routine.duration_minutes} min</Text>

      <Text style={styles.section}>Exercises</Text>
      {routine.exercises.map((ex) => (
        <Card key={ex.id}>
          <Text style={styles.exName}>{ex.name}</Text>
          <Text style={styles.exMeta}>
            {ex.reps ?? (ex.duration_seconds ? `${ex.duration_seconds}s` : "")}
          </Text>
          {ex.description && <Text style={styles.exDesc}>{ex.description}</Text>}
        </Card>
      ))}

      <Button
        title="Start Workout"
        onPress={() => {
          startWorkout(routine);
          router.push("/workout-session");
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.xl, textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  meta: { fontSize: 14, color: colors.textSecondary },
  section: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  exName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  exMeta: { fontSize: 14, color: colors.primary, marginTop: 2 },
  exDesc: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
});
