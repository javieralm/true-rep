import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleTask } from "@truerep/shared";
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

export const TASK_LABEL: Record<ScheduleTask["type"], string> = {
  ROUTINE: "Rutina",
  MESSAGE: "Mensaje",
  VIDEO: "Vídeo",
  NOTE: "Nota",
  SESSION: "Sesión",
};

function TaskTitle({ type, done, children }: { type: ScheduleTask["type"]; done?: boolean; children: string }) {
  return (
    <View style={styles.titleRow} accessibilityLabel={`${TASK_LABEL[type]}: ${children}`}>
      {done ? (
        <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
      ) : (
        <Ionicons name={TASK_ICON[type]} size={16} color={colors.primaryText} />
      )}
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

/** Una tarea del plan del entrenador (rutina, mensaje, vídeo, nota o sesión).
 * La usan Hoy y Mi plan; cada pestaña abre la rutina en su propio stack. */
export function PlanTask({
  task,
  onOpenRoutine,
  highlight,
}: {
  task: ScheduleTask;
  onOpenRoutine: (id: string) => void;
  /** Resalta lo que toca hoy; el resto del plan va sin borde de color. */
  highlight?: boolean;
}) {
  const cardStyle = highlight ? styles.highlight : undefined;

  if (task.type === "ROUTINE" && task.routine) {
    const r = task.routine;
    return (
      <PressableCard onPress={() => onOpenRoutine(r.id)} cardStyle={r.completed ? styles.done : cardStyle}>
        <TaskTitle type="ROUTINE" done={r.completed}>
          {r.title}
        </TaskTitle>
        <Text style={styles.meta}>
          {DIFFICULTY_LABEL[r.difficulty]} · {r.duration_minutes} min
          {r.completed ? " · hecha" : ""}
        </Text>
      </PressableCard>
    );
  }

  const d = task.data ?? {};

  if (task.type === "VIDEO" && d.url) {
    return (
      <PressableCard onPress={() => Linking.openURL(d.url!)} cardStyle={cardStyle}>
        <TaskTitle type="VIDEO">{d.title || "Vídeo"}</TaskTitle>
        <Text style={styles.meta}>Ver vídeo</Text>
      </PressableCard>
    );
  }

  if (task.type === "SESSION") {
    const meta = [d.mode, d.location, d.time].filter(Boolean).join(" · ");
    return (
      <Card style={cardStyle}>
        <TaskTitle type="SESSION">{d.title || "Sesión"}</TaskTitle>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </Card>
    );
  }

  return (
    <Card style={cardStyle}>
      <TaskTitle type={task.type}>{d.title || TASK_LABEL[task.type]}</TaskTitle>
      {d.body ? <Text style={styles.meta}>{d.body}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  highlight: { borderColor: colors.primary, borderWidth: 1.5 },
  done: { borderColor: colors.success, borderWidth: 1.5, backgroundColor: "#f0fdf4" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { ...typo.cardTitle, color: colors.textPrimary, flex: 1 },
  meta: { ...typo.meta, color: colors.textSecondary, marginTop: 2 },
});
