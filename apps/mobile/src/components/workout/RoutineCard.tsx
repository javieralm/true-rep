import { Text, View, StyleSheet } from "react-native";
import { PressableCard } from "@/components/ui/PressableCard";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import type { Routine } from "@truerep/shared";

interface Props {
  routine: Routine & { trainer?: { username: string } };
  onPress: () => void;
}

export function RoutineCard({ routine, onPress }: Props) {
  const exerciseCount = routine.exercises.length;
  return (
    <PressableCard onPress={onPress} cardStyle={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {routine.title}
        </Text>
        <DifficultyBadge difficulty={routine.difficulty} />
      </View>
      <Text style={styles.meta}>
        {routine.trainer?.username ? `${routine.trainer.username} · ` : ""}
        {routine.duration_minutes} min · {exerciseCount} {exerciseCount === 1 ? "ejercicio" : "ejercicios"}
      </Text>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typo.cardTitle, color: colors.textPrimary, flex: 1 },
  meta: { ...typo.meta, color: colors.textSecondary, marginTop: spacing.xs },
});
