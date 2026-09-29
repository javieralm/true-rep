import { useState } from "react";
import { FlatList, Text, View, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useRoutines } from "@/hooks/useRoutines";
import { useRefresh } from "@/hooks/useRefresh";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { colors, spacing, radius } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import { DIFFICULTY_LABEL } from "@/constants/labels";
import type { Difficulty } from "@truerep/shared";

const filters: (Difficulty | null)[] = [null, "BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function WorkoutsScreen() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const { refreshing, onRefresh } = useRefresh();
  const { data: routines, isLoading, error } = useRoutines(difficulty ?? undefined);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f ?? "all"}
            onPress={() => setDifficulty(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: difficulty === f }}
            style={({ pressed }) => [
              styles.chip,
              difficulty === f && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, difficulty === f && styles.chipTextActive]}>
              {f ? DIFFICULTY_LABEL[f] : "Todas"}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && <Text style={styles.error}>No hemos podido cargar las rutinas.</Text>}
      <FlatList
        data={routines ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
        }
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => router.push({ pathname: "/workouts/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>Ninguna rutina coincide con este filtro.</Text>
          ) : (
            <Text style={styles.empty}>Cargando rutinas…</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  filters: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 },
  chip: {
    minHeight: 44, // accesibilidad: touch target mínimo (antes ~32px)
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  chipText: { ...typo.meta, color: colors.textSecondary },
  chipTextActive: { color: colors.onFill, fontWeight: "600" },
  empty: { ...typo.body, textAlign: "center", color: colors.textMuted, marginTop: spacing.xxl },
  error: { ...typo.body, color: colors.dangerText, padding: spacing.lg },
});
