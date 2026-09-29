import { ScrollView, Text, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { usePlan } from "@/hooks/usePlan";
import { useRefresh } from "@/hooks/useRefresh";
import { PlanTask } from "@/components/workout/PlanTask";
import { Card } from "@/components/ui/Card";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

const DAY_NAME = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Mi plan: la semana que ha preparado el entrenador, día a día. Sustituye al
 * catálogo público de rutinas: el cliente entrena lo que le asignan. */
export default function PlanScreen() {
  const router = useRouter();
  const { refreshing, onRefresh } = useRefresh();
  const { data: plan, isLoading, error } = usePlan(true);

  const body = error ? (
    <Text style={styles.error}>No hemos podido cargar tu plan. Desliza hacia abajo para reintentar.</Text>
  ) : isLoading ? (
    <Text style={styles.empty}>Cargando tu plan…</Text>
  ) : !plan ? (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>Aún no tienes plan</Text>
      <Text style={styles.emptyText}>
        Cuando tu entrenador te asigne un programa, aquí verás la semana entera.
      </Text>
    </Card>
  ) : (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{plan.program_name}</Text>
        <Text style={styles.subtitle}>
          {plan.started ? `Semana ${plan.week}` : "Empieza pronto · semana 1"} · con {plan.trainer.username}
        </Text>
      </View>
      {plan.days.map(({ day, tasks }) => {
        const isToday = day === plan.day;
        return (
          <View key={day} style={styles.day} accessibilityLabel={isToday ? `${DAY_NAME[day - 1]}, hoy` : undefined}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, isToday && { color: colors.primaryText }]}>{DAY_NAME[day - 1]}</Text>
              {isToday && <Text style={styles.todayBadge}>Hoy</Text>}
            </View>
            {tasks.length === 0 ? (
              <Text style={styles.rest}>Descanso</Text>
            ) : (
              tasks.map((task, i) => (
                <PlanTask
                  key={i}
                  task={task}
                  highlight={isToday}
                  onOpenRoutine={(id) => router.push({ pathname: "/workouts/[id]", params: { id } })}
                />
              ))
            )}
          </View>
        );
      })}
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.xs },
  title: { ...typo.title, color: colors.textPrimary },
  subtitle: { ...typo.meta, color: colors.textSecondary },
  day: { gap: spacing.sm },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dayName: { ...typo.cardTitle, color: colors.textPrimary },
  todayBadge: {
    ...typo.label,
    color: colors.onFill,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    overflow: "hidden",
  },
  rest: { ...typo.meta, color: colors.textMuted },
  empty: { ...typo.body, color: colors.textMuted },
  error: { ...typo.meta, color: colors.dangerText },
  emptyCard: { gap: spacing.sm },
  emptyTitle: { ...typo.cardTitle, color: colors.textPrimary },
  emptyText: { ...typo.meta, color: colors.textSecondary },
});
