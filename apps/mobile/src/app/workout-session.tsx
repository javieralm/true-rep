import { useState } from "react";
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkoutStore } from "@/state/workoutStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, spacing } from "@/constants/colors";
import type { LogWorkoutResponse } from "@truerep/shared";

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeRoutine, startedAt, completed, toggleExercise, setWeight, reset } = useWorkoutStore();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<LogWorkoutResponse | null>(null);

  if (result) {
    return <CompletionScreen result={result} onDone={() => router.back()} />;
  }

  if (!activeRoutine) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loading}>No active workout.</Text>
        <Button title="Back to routines" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  async function onFinish() {
    if (!activeRoutine || completed.length === 0) {
      Alert.alert("Mark at least one exercise as done");
      return;
    }
    setSaving(true);
    try {
      const res = await api<LogWorkoutResponse>("/workouts/log", {
        method: "POST",
        body: JSON.stringify({
          routine_id: activeRoutine.id,
          duration_minutes: Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 60000)),
          exercises_completed: completed,
        }),
      });
      // Un workout nuevo afecta a me, schedule, stats e historial — invalida todo
      qc.invalidateQueries();
      reset();
      setResult(res);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not log workout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={styles.title}>{activeRoutine.title}</Text>
      <Text style={styles.hint}>Tap exercises as you complete them.</Text>
      {activeRoutine.exercises.map((ex) => {
        const entry = completed.find((c) => c.exercise_id === ex.id);
        const done = !!entry;
        return (
          <Pressable key={ex.id} onPress={() => toggleExercise(ex.id)}>
            <Card style={done ? styles.done : undefined}>
              <Text style={[styles.exName, done && { color: colors.success }]}>
                {done ? "✓ " : "○ "}
                {ex.name}
              </Text>
              <Text style={styles.exMeta}>{ex.reps ?? (ex.duration_seconds ? `${ex.duration_seconds}s` : "")}</Text>
              {done && (
                <View style={styles.weightRow}>
                  <Text style={styles.weightLabel}>Peso (kg, opcional)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder="—"
                    defaultValue={entry.weight_kg?.toString() ?? ""}
                    onChangeText={(v) => {
                      const n = parseFloat(v.replace(",", "."));
                      setWeight(ex.id, Number.isFinite(n) && n >= 0 ? n : undefined);
                    }}
                    style={styles.weightInput}
                  />
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}
      <Button title={saving ? "Saving…" : "Finish Workout"} onPress={onFinish} disabled={saving} />
    </ScrollView>
  );
}

/** Pico emocional del flujo: reemplaza el Alert.alert de sistema por una
 * pantalla que celebra XP/racha/logros antes de volver al inicio. */
function CompletionScreen({ result, onDone }: { result: LogWorkoutResponse; onDone: () => void }) {
  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionEmoji}>🎉</Text>
      <Text style={styles.completionTitle}>Workout complete!</Text>
      <View style={styles.completionStatsRow}>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>+{result.xp_earned}</Text>
          <Text style={styles.completionStatLabel}>XP</Text>
        </View>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>🔥 {result.user.streak}</Text>
          <Text style={styles.completionStatLabel}>day streak</Text>
        </View>
      </View>
      {result.unlocked_achievements.length > 0 && (
        <Card style={styles.achievementsCard}>
          <Text style={styles.achievementsTitle}>Achievements unlocked</Text>
          {result.unlocked_achievements.map((name) => (
            <Text key={name} style={styles.achievementItem}>
              🏆 {name}
            </Text>
          ))}
        </Card>
      )}
      <Button title="Back to home" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  loading: { textAlign: "center", color: colors.textMuted },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textMuted },
  done: { borderColor: colors.success, backgroundColor: "#f0fdf4" },
  exName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  exMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  weightLabel: { fontSize: 12, color: colors.textSecondary },
  weightInput: {
    minWidth: 64,
    minHeight: 44, // accesibilidad: touch target mínimo
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  completionEmoji: { fontSize: 56 },
  completionTitle: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  completionStatsRow: { flexDirection: "row", gap: spacing.xl },
  completionStat: { alignItems: "center" },
  completionStatValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
  completionStatLabel: { fontSize: 13, color: colors.textSecondary },
  achievementsCard: { width: "100%", gap: spacing.xs },
  achievementsTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  achievementItem: { fontSize: 14, color: colors.textPrimary },
});
