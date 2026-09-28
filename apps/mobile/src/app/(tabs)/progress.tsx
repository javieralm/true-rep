import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/hooks/useUser";
import { useStats } from "@/hooks/useStats";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";

/* ponytail: gráfico de barras con Views puras — librería de charts cuando haga falta interactividad */
function WeeklyBars({ weekly }: { weekly: Array<{ workouts: number }> }) {
  const max = Math.max(1, ...weekly.map((w) => w.workouts));
  return (
    <View style={styles.chart}>
      {weekly.map((w, i) => (
        <View key={i} style={styles.barSlot}>
          <View
            style={[
              styles.bar,
              { height: `${(w.workouts / max) * 100}%` },
              w.workouts === 0 && styles.barEmpty,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const isActive = user?.subscription_status === "ACTIVE";
  const isPremium = isActive && user?.subscription_plan === "PREMIUM";
  const { data: stats } = useStats(!!isActive);
  const { data: history } = useWorkoutHistory(10);

  if (user && !isActive) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>Tu progreso te espera 📈</Text>
        <Text style={styles.lockedText}>
          Con el plan Base llevas el seguimiento de tus entrenamientos, reps y racha semana a semana.
        </Text>
        <Button title="Ver planes" onPress={() => router.push("/paywall")} />
      </View>
    );
  }

  const latestWeight = (entries: Array<{ weight_kg: number }>) =>
    entries[entries.length - 1]?.weight_kg;
  const weightDelta = (entries: Array<{ weight_kg: number }>) => {
    if (entries.length < 2) return null;
    return entries[entries.length - 1].weight_kg - entries[0].weight_kg;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={styles.title}>Tu progreso</Text>

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{stats?.totals.workouts ?? 0}</Text>
          <Text style={styles.statLabel}>Entrenos (12 sem)</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{stats?.totals.reps ?? 0}</Text>
          <Text style={styles.statLabel}>Reps totales</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>🔥 {stats?.totals.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Racha</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.section}>Entrenos por semana</Text>
        {stats ? (
          <>
            <WeeklyBars weekly={stats.weekly} />
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>hace 12 sem</Text>
              <Text style={styles.chartLabel}>esta semana</Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Cargando…</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.section}>Pesos por ejercicio</Text>
        {!isPremium ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.empty}>
              Estadísticas avanzadas: progresión de cargas por ejercicio, disponible en Premium.
            </Text>
            <Button title="Mejorar a Premium" variant="outline" onPress={() => router.push("/paywall")} />
          </View>
        ) : !stats?.weights || stats.weights.length === 0 ? (
          <Text style={styles.empty}>
            Aún no hay registros de peso. Apunta el peso al completar ejercicios en tus workouts.
          </Text>
        ) : (
          stats.weights.map((w) => {
            const delta = weightDelta(w.entries);
            return (
              <View key={w.exercise_id} style={styles.weightRow}>
                <Text style={styles.weightName}>{w.exercise_name}</Text>
                <Text style={styles.weightValue}>
                  {latestWeight(w.entries)} kg
                  {delta !== null && delta !== 0 && (
                    <Text style={{ color: delta > 0 ? colors.success : colors.danger }}>
                      {"  "}
                      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} kg
                    </Text>
                  )}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Text style={styles.section}>Últimos entrenos</Text>
        {!history || history.length === 0 ? (
          <Text style={styles.empty}>Aún no hay entrenos registrados.</Text>
        ) : (
          history.map((w) => (
            <View key={w.id} style={styles.historyRow}>
              <View style={styles.historyHeader}>
                <Text style={styles.weightName}>{w.routine?.title ?? "Workout"}</Text>
                <Text style={styles.historyDate}>
                  {new Date(w.completed_at).toLocaleDateString()} · +{w.xp_earned} XP
                </Text>
              </View>
              {w.trainer_feedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>💬 Tu coach</Text>
                  <Text style={styles.feedbackText}>{w.trainer_feedback}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  section: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, marginBottom: spacing.md },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: colors.primary, borderRadius: 4, minHeight: 4 },
  barEmpty: { backgroundColor: "#e5e5e5" },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  chartLabel: { fontSize: 10, color: colors.textMuted },
  empty: { fontSize: 13, color: colors.textMuted },
  weightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  weightName: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  weightValue: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  historyRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
    gap: spacing.xs,
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyDate: { fontSize: 12, color: colors.textMuted },
  feedbackBox: {
    backgroundColor: "#fff7f2",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 6,
    padding: spacing.sm,
    gap: 2,
  },
  feedbackLabel: { fontSize: 11, fontWeight: "700", color: colors.primary },
  feedbackText: { fontSize: 13, color: colors.textPrimary },
  locked: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface },
  lockedTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  lockedText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
