import { useState } from "react";
import { FlatList, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useRoutines } from "@/hooks/useRoutines";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { colors, spacing, radius } from "@/constants/colors";
import type { Difficulty } from "@truerep/shared";

const filters: (Difficulty | null)[] = [null, "BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function WorkoutsScreen() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const { data: routines, isLoading, error } = useRoutines(difficulty ?? undefined);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f ?? "all"}
            onPress={() => setDifficulty(f)}
            style={[styles.chip, difficulty === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, difficulty === f && { color: "#fff" }]}>
              {f ? f.toLowerCase() : "all"}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && <Text style={styles.error}>Could not load routines.</Text>}
      <FlatList
        data={routines ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => router.push({ pathname: "/routine-detail", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No routines match this filter.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  filters: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xxl },
  error: { color: colors.danger, padding: spacing.lg },
});
