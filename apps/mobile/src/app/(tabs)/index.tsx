import { ScrollView, Text, View, StyleSheet, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleTask } from "@truerep/shared";
import { useUser } from "@/hooks/useUser";
import { useRoutines } from "@/hooks/useRoutines";
import { useSchedule } from "@/hooks/useSchedule";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { Card } from "@/components/ui/Card";
import { colors, spacing } from "@/constants/colors";

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
      <Pressable onPress={() => router.push({ pathname: "/routine-detail", params: { id: r.id } })}>
        <Card style={r.completed ? styles.todayDone : styles.today}>
          <TaskTitle type="ROUTINE" done={r.completed}>
            {r.title}
          </TaskTitle>
          <Text style={styles.todayMeta}>
            {r.difficulty.toLowerCase()} · {r.duration_minutes} min
            {r.completed ? " · completada" : ""}
          </Text>
        </Card>
      </Pressable>
    );
  }

  const d = task.data ?? {};
  const title = d.title || TASK_LABEL[task.type];

  // Vídeo: abre la URL externa
  if (task.type === "VIDEO" && d.url) {
    return (
      <Pressable onPress={() => Linking.openURL(d.url!)}>
        <Card style={styles.today}>
          <TaskTitle type="VIDEO">{d.title || "Vídeo"}</TaskTitle>
          <Text style={styles.todayMeta}>Ver vídeo</Text>
        </Card>
      </Pressable>
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
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: routines, isLoading: isRoutinesLoading } = useRoutines();
  const isPremium = user?.subscription_status === "ACTIVE" && user?.subscription_plan === "PREMIUM";
  const { data: schedule, isLoading: isScheduleLoading } = useSchedule(isPremium);
  const recommended = routines?.[0];

  // Un usuario con progreso real no debe ver "0 XP" mientras carga: loading
  // y "de verdad no tiene datos" son estados distintos, se muestran distinto.
  if (isUserLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.empty}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.greeting}>Hey {user?.username ?? "athlete"} 👋</Text>

      {/* Acción dominante primero: la rutina/tarea de hoy es lo que el
          usuario vino a hacer. Las stats son contexto de apoyo, no lo primero
          que se ve (jerarquía invertida señalada en el Design Review). */}
      {isScheduleLoading ? (
        <Text style={styles.empty}>Loading today&apos;s plan…</Text>
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
          <Text style={styles.section}>Today&apos;s Recommendation</Text>
          {isRoutinesLoading ? (
            <Text style={styles.empty}>Loading routines…</Text>
          ) : recommended ? (
            <RoutineCard
              routine={recommended}
              onPress={() => router.push({ pathname: "/routine-detail", params: { id: recommended.id } })}
            />
          ) : (
            <Text style={styles.empty}>No routines available yet.</Text>
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
          <Text style={styles.statLabel}>Streak</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{Math.floor((user?.xp ?? 0) / 100) + 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centerContainer: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  section: { fontSize: 18, fontWeight: "600", marginBottom: spacing.md, color: colors.textPrimary },
  empty: { color: colors.textMuted },
  today: { borderColor: colors.primary, borderWidth: 1.5 },
  todayDone: { borderColor: colors.success, borderWidth: 1.5, opacity: 0.7 },
  taskTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  todayTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  todayMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
