import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import { DIFFICULTY_LABEL } from "@/constants/labels";
import type { Difficulty } from "@truerep/shared";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.difficulty[difficulty] }]}>
      <Text style={styles.text}>{DIFFICULTY_LABEL[difficulty]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  text: { ...typo.label, color: "#fff" },
});
