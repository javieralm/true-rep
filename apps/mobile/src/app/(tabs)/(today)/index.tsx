import { ScrollView, Text, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/hooks/useUser";
import { useSchedule } from "@/hooks/useSchedule";
import { useRefresh } from "@/hooks/useRefresh";
import { PlanTask } from "@/components/workout/PlanTask";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function TodayScreen() {
  const router = useRouter();
  const { refreshing, onRefresh } = useRefresh();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: schedule, isLoading: isScheduleLoading, error: scheduleError } = useSchedule(true);

  // Un usuario con progreso real no debe ver "0 XP" mientras carga: loading
  // y "de verdad no tiene datos" son estados distintos, se muestran distinto.
  if (isUserLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.empty}>Cargando…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >
      <Text style={styles.greeting}>Hola, {user?.username ?? "atleta"}</Text>

      {/* Acción dominante primero: lo que el entrenador ha puesto para hoy es
          lo que el usuario vino a hacer. Las stats son contexto de apoyo. */}
      {scheduleError ? (
        // Antes cualquier fallo se convertía en "sin plan" y el usuario con
        // programa asignado creía que no tenía nada para hoy.
        <Text style={styles.scheduleError}>
          No hemos podido cargar tu plan de hoy. Desliza hacia abajo para reintentar.
        </Text>
      ) : isScheduleLoading ? (
        <Text style={styles.empty}>Cargando el plan de hoy…</Text>
      ) : schedule && schedule.tasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Para hoy</Text>
          <Text style={styles.sectionMeta}>
            {schedule.program_name} · semana {schedule.week}
          </Text>
          <View style={styles.tasks}>
            {schedule.tasks.map((task, i) => (
              <PlanTask
                key={i}
                task={task}
                highlight
                onOpenRoutine={(id) => router.push({ pathname: "/routine/[id]", params: { id } })}
              />
            ))}
          </View>
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{schedule ? "Hoy toca descanso" : "Aún no tienes plan"}</Text>
          <Text style={styles.emptyText}>
            {schedule
              ? "Tu entrenador no ha puesto nada para hoy. Puedes repasar el resto de la semana."
              : "Cuando tu entrenador te asigne un programa, aquí verás lo que toca cada día."}
          </Text>
          {schedule && (
            <Button title="Ver mi semana" variant="outline" onPress={() => router.navigate("/workouts")} />
          )}
        </Card>
      )}

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{user?.xp ?? 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{user?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>{user?.streak === 1 ? "Día de racha" : "Días de racha"}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{Math.floor((user?.xp ?? 0) / 100) + 1}</Text>
          <Text style={styles.statLabel}>Nivel</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  centerContainer: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  greeting: { ...typo.display, color: colors.textPrimary },
  section: { gap: spacing.xs },
  sectionTitle: { ...typo.section, color: colors.textPrimary },
  sectionMeta: { ...typo.meta, color: colors.textSecondary },
  tasks: { gap: spacing.sm, marginTop: spacing.sm },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typo.stat, color: colors.primaryText },
  statLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  empty: { ...typo.body, color: colors.textMuted },
  emptyCard: { gap: spacing.sm },
  emptyTitle: { ...typo.cardTitle, color: colors.textPrimary },
  emptyText: { ...typo.meta, color: colors.textSecondary },
  scheduleError: { ...typo.meta, color: colors.dangerText },
});
