import { useState } from "react";
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkoutStore } from "@/state/workoutStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, spacing } from "@/constants/colors";

interface LogResult {
  xp_earned: number;
  user: { xp: number; streak: number };
  unlocked_achievements: string[];
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeRoutine, startedAt, completed, toggleExercise, setWeight, reset } = useWorkoutStore();
  const [saving, setSaving] = useState(false);

  if (!activeRoutine) return <Text style={styles.loading}>No active workout.</Text>;

  async function onFinish() {
    if (!activeRoutine || completed.length === 0) {
      Alert.alert("Mark at least one exercise as done");
      return;
    }
    setSaving(true);
    try {
      const result = await api<LogResult>("/workouts/log", {
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
      const badges = result.unlocked_achievements.length
        ? `\n🏆 Unlocked: ${result.unlocked_achievements.join(", ")}`
        : "";
      Alert.alert("Workout complete!", `+${result.xp_earned} XP · 🔥 ${result.user.streak}-day streak${badges}`, [
        { text: "Nice!", onPress: () => router.back() },
      ]);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.xl, textAlign: "center", color: colors.textMuted },
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
});
