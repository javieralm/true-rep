import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoutine } from "@/hooks/useRoutines";
import { useWorkoutStore } from "@/state/workoutStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: routine, isLoading } = useRoutine(id);
  const startWorkout = useWorkoutStore((s) => s.start);

  if (isLoading || !routine) return <Text style={styles.loading}>Cargando…</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>{routine.title}</Text>
        <DifficultyBadge difficulty={routine.difficulty} />
      </View>
      <Text style={styles.description}>{routine.description}</Text>
      <Text style={styles.meta}>⏱ {routine.duration_minutes} min</Text>

      <Text style={styles.section}>Ejercicios</Text>
      {routine.exercises.map((ex) => {
        const suggestion = routine.weight_suggestions?.find((s) => s.exercise_id === ex.id);
        return (
          <Card key={ex.id}>
            <Text style={styles.exName}>{ex.name}</Text>
            <Text style={styles.exMeta}>
              {ex.reps ?? (ex.duration_seconds ? `${ex.duration_seconds}s` : "")}
            </Text>
            {ex.description && <Text style={styles.exDesc}>{ex.description}</Text>}
            {suggestion && (
              <Text style={styles.suggestion}>
                💡 Sugerencia: {suggestion.suggested_weight_kg}kg (la última vez, {suggestion.last_weight_kg}kg,
                se sintió fácil)
              </Text>
            )}
          </Card>
        );
      })}

      <Button
        title="Empezar entrenamiento"
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
  loading: { ...typo.body, padding: spacing.xl, textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typo.display, color: colors.textPrimary, flex: 1 },
  description: { ...typo.body, color: colors.textSecondary },
  meta: { ...typo.meta, color: colors.textSecondary },
  section: { ...typo.section, color: colors.textPrimary },
  exName: { ...typo.cardTitle, color: colors.textPrimary },
  exMeta: { ...typo.meta, color: colors.primary, marginTop: 2 },
  exDesc: { ...typo.meta, color: colors.textSecondary, marginTop: spacing.xs },
  suggestion: { ...typo.meta, color: colors.primary, fontWeight: "600", marginTop: spacing.xs },
});
