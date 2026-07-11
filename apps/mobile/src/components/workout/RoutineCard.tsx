import { Pressable, Text, View, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import type { Routine } from "@truerep/shared";

interface Props {
  routine: Routine & { trainer?: { username: string } };
  onPress: () => void;
}

export function RoutineCard({ routine, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {routine.title}
          </Text>
          <DifficultyBadge difficulty={routine.difficulty} />
        </View>
        <Text style={styles.meta}>
          {routine.trainer?.username ? `${routine.trainer.username} · ` : ""}
          {routine.duration_minutes} min · {routine.exercises.length} exercises
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  meta: { marginTop: spacing.xs, fontSize: 13, color: colors.textSecondary },
});
