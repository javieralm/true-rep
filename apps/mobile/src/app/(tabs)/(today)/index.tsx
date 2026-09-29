import { ScrollView, Text, View, StyleSheet, Linking, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleTask } from "@truerep/shared";
import { useUser } from "@/hooks/useUser";
import { useRoutines } from "@/hooks/useRoutines";
import { useSchedule } from "@/hooks/useSchedule";
import { useRefresh } from "@/hooks/useRefresh";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { Card } from "@/components/ui/Card";
import { PressableCard } from "@/components/ui/PressableCard";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import { DIFFICULTY_LABEL } from "@/constants/labels";

const TASK_ICON: Record<ScheduleTask["type"], keyof typeof Ionicons.glyphMap> = {
  ROUTINE: "barbell",
  MESSAGE: "chatbubble",
  VIDEO: "videocam",
  NOTE: "document-text",
  SESSION: "calendar",
};

const TASK_LABEL: Record<ScheduleTask["type"], string> = {
  ROUTINE: "Rutina",
  MESSAGE: "Mensaje",
  VIDEO: "Vídeo",
  NOTE: "Nota",
  SESSION: "Sesión",
};

function TaskTitle({ type, done, children }: { type: ScheduleTask["type"]; done?: boolean; children: string }) {
  return (
    <View style={styles.taskTitleRow} accessibilityLabel={`${TASK_LABEL[type]}: ${children}`}>
      {done ? (
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      ) : (
        <Ionicons name={TASK_ICON[type]} size={16} color={colors.primary} />
      )}
      <Text style={styles.todayTitle}>{children}</Text>
    </View>
  );
}

function TodayTask({ task, router }: { task: ScheduleTask; router: ReturnType<typeof useRouter> }) {
  // Rutina: navegable al detalle, con estado de completada
  if (task.type === "ROUTINE" && task.routine) {
    const r = task.routine;
    return (
      <PressableCard
        onPress={() => router.push({ pathname: "/routine/[id]", params: { id: r.id } })}
        cardStyle={r.completed ? styles.todayDone : styles.today}
      >
        <TaskTitle type="ROUTINE" done={r.completed}>
          {r.title}
        </TaskTitle>
        <Text style={styles.todayMeta}>
          {DIFFICULTY_LABEL[r.difficulty]} · {r.duration_minutes} min
          {r.completed ? " · completada" : ""}
        </Text>
      </PressableCard>
    );
  }

  const d = task.data ?? {};
  const title = d.title || TASK_LABEL[task.type];

  // Vídeo: abre la URL externa
  if (task.type === "VIDEO" && d.url) {
    return (
      <PressableCard onPress={() => Linking.openURL(d.url!)} cardStyle={styles.today}>
        <TaskTitle type="VIDEO">{d.title || "Vídeo"}</TaskTitle>
        <Text style={styles.todayMeta}>Ver vídeo</Text>
      </PressableCard>
    );
  }

  // Sesión: modo + lugar/enlace + hora
  if (task.type === "SESSION") {
    const meta = [d.mode, d.location, d.time].filter(Boolean).join(" · ");
    return (
      <Card style={styles.today}>
        <TaskTitle type="SESSION">{d.title || "Sesión"}</TaskTitle>
        {meta ? <Text style={styles.todayMeta}>{meta}</Text> : null}
      </Card>
    );
  }

  // Mensaje / Nota: título + cuerpo
  return (
    <Card style={styles.today}>
      <TaskTitle type={task.type}>{title}</TaskTitle>
      {d.body ? <Text style={styles.todayMeta}>{d.body}</Text> : null}
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { refreshing, onRefresh } = useRefresh();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: routines, isLoading: isRoutinesLoading } = useRoutines();
  const isPremium = user?.subscription_status === "ACTIVE" && user?.subscription_plan === "PREMIUM";
  const { data: schedule, isLoading: isScheduleLoading, error: scheduleError } = useSchedule(isPremium);
  const recommended = routines?.[0];

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
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >
      <Text style={styles.greeting}>Hola, {user?.username ?? "atleta"} 👋</Text>

      {/* Si el plan no ha podido cargarse se dice, y se sigue mostrando el
          recomendado debajo. Antes el hook convertía cualquier fallo en null y
          el usuario con programa asignado creía que no tenía nada para hoy. */}
      {scheduleError && (
        <Text style={styles.scheduleError}>
          No hemos podido cargar tu plan de hoy. Desliza hacia abajo para reintentar.
        </Text>
      )}

      {/* Acción dominante primero: la rutina/tarea de hoy es lo que el
          usuario vino a hacer. Las stats son contexto de apoyo, no lo primero
          que se ve (jerarquía invertida señalada en el Design Review). */}
      {isScheduleLoading ? (
        <Text style={styles.empty}>Cargando el plan de hoy…</Text>
      ) : schedule && schedule.tasks.length > 0 ? (
        <>
          <Text style={styles.section}>
            Hoy · {schedule.program_name} (semana {schedule.week})
          </Text>
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {schedule.tasks.map((task, i) => (
              <TodayTask key={i} task={task} router={router} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.section}>Recomendado para hoy</Text>
          {isRoutinesLoading ? (
            <Text style={styles.empty}>Cargando rutinas…</Text>
          ) : recommended ? (
            <RoutineCard
              routine={recommended}
              onPress={() => router.push({ pathname: "/routine/[id]", params: { id: recommended.id } })}
            />
          ) : (
            <Text style={styles.empty}>Todavía no hay rutinas disponibles.</Text>
          )}
        </>
      )}

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{user?.xp ?? 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>🔥 {user?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Racha</Text>
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
  centerContainer: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  greeting: { ...typo.display, color: colors.textPrimary, marginBottom: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typo.stat, color: colors.primaryText },
  statLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary, marginTop: spacing.xs },
  section: { ...typo.section, color: colors.textPrimary, marginBottom: spacing.md },
  empty: { ...typo.body, color: colors.textMuted },
  scheduleError: { ...typo.meta, color: colors.dangerText, marginBottom: spacing.md },
  today: { borderColor: colors.primary, borderWidth: 1.5 },
  todayDone: { borderColor: colors.success, borderWidth: 1.5, opacity: 0.7 },
  taskTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  todayTitle: { ...typo.cardTitle, color: colors.textPrimary, flex: 1 },
  todayMeta: { ...typo.meta, color: colors.textSecondary, marginTop: 2 },
});
