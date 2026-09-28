import { useRef, useState } from "react";
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkoutStore } from "@/state/workoutStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PressableCard } from "@/components/ui/PressableCard";
import { colors, spacing, radius } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import type { LogWorkoutResponse } from "@truerep/shared";

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeRoutine, startedAt, completed, toggleExercise, setWeight, setReps, setFeltLike, reset } =
    useWorkoutStore();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<LogWorkoutResponse | null>(null);
  // Misma key en cada reintento del mismo intento de guardado (error de red,
  // doble-tap) — solo cambia si el usuario empieza una rutina distinta.
  // Sin esto, un reintento genera un workout duplicado en vez de deduplicar.
  const idempotencyKeyRef = useRef<{ routineId: string; key: string } | null>(null);

  if (result) {
    return <CompletionScreen result={result} onDone={() => router.back()} />;
  }

  if (!activeRoutine) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loading}>No hay ningún entrenamiento en curso.</Text>
        <Button title="Volver a las rutinas" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  async function onFinish() {
    if (!activeRoutine || completed.length === 0) {
      Alert.alert("Marca al menos un ejercicio como hecho");
      return;
    }
    setSaving(true);
    try {
      if (idempotencyKeyRef.current?.routineId !== activeRoutine.id) {
        idempotencyKeyRef.current = { routineId: activeRoutine.id, key: crypto.randomUUID() };
      }
      const res = await api<LogWorkoutResponse>("/workouts/log", {
        method: "POST",
        body: JSON.stringify({
          routine_id: activeRoutine.id,
          duration_minutes: Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 60000)),
          exercises_completed: completed,
          idempotency_key: idempotencyKeyRef.current.key,
        }),
      });
      // Un workout nuevo afecta a me, schedule, stats e historial — invalida todo
      qc.invalidateQueries();
      reset();
      setResult(res);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No hemos podido guardar el entrenamiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={styles.title}>{activeRoutine.title}</Text>
      <Text style={styles.hint}>Toca cada ejercicio a medida que lo completes.</Text>
      {activeRoutine.exercises.map((ex) => {
        const entry = completed.find((c) => c.exercise_id === ex.id);
        const done = !!entry;
        return (
          <PressableCard
            key={ex.id}
            onPress={() => toggleExercise(ex.id)}
            accessibilityState={{ checked: done }}
            cardStyle={done ? styles.done : undefined}
          >
            <Text style={[styles.exName, done && { color: colors.success }]}>
              {done ? "✓ " : "○ "}
              {ex.name}
            </Text>
            <Text style={styles.exMeta}>{ex.reps ?? (ex.duration_seconds ? `${ex.duration_seconds}s` : "")}</Text>
            {done && (
              <>
                <View style={styles.weightRow}>
                  <Text style={styles.weightLabel}>Reps</Text>
                  <TextInput
                    keyboardType="number-pad"
                    defaultValue={entry.reps_done.toString()}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      setReps(ex.id, Number.isFinite(n) && n > 0 ? n : 1);
                    }}
                    style={styles.weightInput}
                  />
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
                <View style={styles.feltRow}>
                  {(["easy", "medium", "hard"] as const).map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setFeltLike(ex.id, f)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: entry.felt_like === f }}
                      style={({ pressed }) => [
                        styles.feltChip,
                        entry.felt_like === f && styles.feltChipActive,
                        pressed && styles.feltChipPressed,
                      ]}
                    >
                      <Text style={[styles.feltChipText, entry.felt_like === f && styles.feltChipTextActive]}>
                        {f === "easy" ? "😌 Fácil" : f === "medium" ? "🙂 Normal" : "😅 Difícil"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </PressableCard>
        );
      })}
      <Button
        title={saving ? "Guardando…" : "Terminar entrenamiento"}
        onPress={onFinish}
        disabled={saving}
      />
    </ScrollView>
  );
}

/** Pico emocional del flujo: reemplaza el Alert.alert de sistema por una
 * pantalla que celebra XP/racha/logros antes de volver al inicio. */
function CompletionScreen({ result, onDone }: { result: LogWorkoutResponse; onDone: () => void }) {
  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionEmoji}>🎉</Text>
      <Text style={styles.completionTitle}>¡Entrenamiento completado!</Text>
      <View style={styles.completionStatsRow}>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>+{result.xp_earned}</Text>
          <Text style={styles.completionStatLabel}>XP</Text>
        </View>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>🔥 {result.user.streak}</Text>
          <Text style={styles.completionStatLabel}>
            {result.user.streak === 1 ? "día de racha" : "días de racha"}
          </Text>
        </View>
      </View>
      {result.unlocked_achievements.length > 0 && (
        <Card style={styles.achievementsCard}>
          <Text style={styles.achievementsTitle}>Logros desbloqueados</Text>
          {result.unlocked_achievements.map((name) => (
            <Text key={name} style={styles.achievementItem}>
              🏆 {name}
            </Text>
          ))}
        </Card>
      )}
      <Button title="Volver al inicio" onPress={onDone} />
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
  loading: { ...typo.body, textAlign: "center", color: colors.textMuted },
  title: { ...typo.title, color: colors.textPrimary },
  hint: { ...typo.meta, color: colors.textMuted },
  done: { borderColor: colors.success, backgroundColor: "#f0fdf4" },
  exName: { ...typo.cardTitle, color: colors.textPrimary },
  exMeta: { ...typo.meta, color: colors.textSecondary, marginTop: 2 },
  weightRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  weightLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  weightInput: {
    minWidth: 64,
    minHeight: 44, // accesibilidad: touch target mínimo
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    ...typo.body,
    color: colors.textPrimary,
  },
  feltRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  feltChip: {
    flex: 1,
    minHeight: 44, // accesibilidad: touch target mínimo
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  feltChipActive: { borderColor: colors.primary, backgroundColor: "#FFF3ED" },
  feltChipPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  feltChipText: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  feltChipTextActive: { color: colors.primary, fontWeight: "700" },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  completionEmoji: { fontSize: 56 },
  completionTitle: {
    ...typo.display,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  completionStatsRow: { flexDirection: "row", gap: spacing.xl },
  completionStat: { alignItems: "center", gap: spacing.xs },
  completionStatValue: { fontSize: 28, lineHeight: 30, letterSpacing: -0.7, fontWeight: "800", color: colors.primary },
  completionStatLabel: { ...typo.meta, color: colors.textSecondary },
  achievementsCard: { width: "100%", gap: spacing.xs },
  achievementsTitle: { ...typo.cardTitle, fontSize: 14, color: colors.textPrimary },
  achievementItem: { fontSize: 14, color: colors.textPrimary },
});
