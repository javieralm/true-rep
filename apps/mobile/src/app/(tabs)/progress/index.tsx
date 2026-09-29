import { ScrollView, Text, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/hooks/useUser";
import { useStats } from "@/hooks/useStats";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useRefresh } from "@/hooks/useRefresh";
import { Card } from "@/components/ui/Card";
import { PressableCard } from "@/components/ui/PressableCard";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

/* ponytail: gráfico de barras con Views puras — librería de charts cuando haga falta interactividad */
function WeeklyBars({ weekly }: { weekly: { workouts: number }[] }) {
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
  const { refreshing, onRefresh } = useRefresh();
  const { data: user } = useUser();
  const isActive = user?.subscription_status === "ACTIVE";
  const isPremium = isActive && user?.subscription_plan === "PREMIUM";
  const { data: stats } = useStats(!!isActive);
  const { data: history } = useWorkoutHistory(10);

  if (user && !isActive) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>Tu progreso te espera</Text>
        <Text style={styles.lockedText}>
          Con el plan Base llevas el seguimiento de tus entrenamientos, reps y racha semana a semana.
        </Text>
        <Button title="Ver planes" onPress={() => router.navigate("/paywall")} />
      </View>
    );
  }

  const latestWeight = (entries: { weight_kg: number }[]) =>
    entries[entries.length - 1]?.weight_kg;
  const weightDelta = (entries: { weight_kg: number }[]) => {
    if (entries.length < 2) return null;
    return entries[entries.length - 1].weight_kg - entries[0].weight_kg;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >

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
          <Text style={styles.statValue}>{stats?.totals.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Días de racha</Text>
        </Card>
      </View>

      <PressableCard onPress={() => router.push("/progress/challenges")} accessibilityLabel="Retos">
        <View style={styles.linkRow}>
          <Ionicons name="trophy" size={20} color={colors.primaryText} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Retos</Text>
            <Text style={styles.linkMeta}>Compite con otros y gana XP extra</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </PressableCard>

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
            <Button title="Mejorar a Premium" variant="outline" onPress={() => router.navigate("/paywall")} />
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
                    <Text style={{ color: delta > 0 ? colors.successText : colors.dangerText }}>
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
                  {new Date(w.completed_at).toLocaleDateString("es-ES")} · +{w.xp_earned} XP
                </Text>
              </View>
              {w.trainer_feedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Tu entrenador</Text>
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
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typo.stat, color: colors.primaryText },
  statLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  section: { ...typo.cardTitle, color: colors.textPrimary, marginBottom: spacing.md },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkTitle: { ...typo.cardTitle, color: colors.textPrimary },
  linkMeta: { ...typo.meta, color: colors.textSecondary },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { backgroundColor: colors.primary, borderRadius: 4, minHeight: 4 },
  barEmpty: { backgroundColor: "#e5e5e5" },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  chartLabel: { ...typo.label, fontWeight: "400", color: colors.textMuted },
  empty: { ...typo.meta, color: colors.textMuted },
  weightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  weightName: { ...typo.body, fontWeight: "500", color: colors.textPrimary },
  weightValue: { ...typo.body, fontWeight: "600", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  historyRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
    gap: spacing.xs,
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyDate: { ...typo.label, fontWeight: "400", color: colors.textMuted },
  feedbackBox: {
    backgroundColor: "#fff7f2",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 6,
    padding: spacing.sm,
    gap: 2,
  },
  feedbackLabel: { ...typo.label, color: colors.primaryText },
  feedbackText: { ...typo.meta, color: colors.textPrimary },
  locked: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface },
  lockedTitle: { ...typo.title, color: colors.textPrimary, textAlign: "center" },
  lockedText: { ...typo.body, color: colors.textSecondary, textAlign: "center" },
});
