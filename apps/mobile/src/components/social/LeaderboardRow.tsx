import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/colors";
import type { LeaderboardRow as Row } from "@truerep/shared";

export function LeaderboardRow({ row }: { row: Row }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rank}>{row.rank ?? "—"}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {row.username}
      </Text>
      <Text style={styles.status}>
        {row.completed_at ? "✓ done" : row.xp != null ? `${row.xp} XP` : "in progress"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rank: { width: 32, fontSize: 16, fontWeight: "700", color: colors.primary },
  name: { flex: 1, fontSize: 15, color: colors.textPrimary },
  status: { fontSize: 13, color: colors.textSecondary },
});
