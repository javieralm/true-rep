import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/colors";
import type { Difficulty } from "@truerep/shared";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.difficulty[difficulty] }]}>
      <Text style={styles.text}>{difficulty.toLowerCase()}</Text>
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
  text: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
