import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoutine } from "@/hooks/useRoutines";
import { useWorkoutStore } from "@/state/workoutStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { DifficultyBadge } from "@/components/ui/Badge";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

/** Detalle de una rutina. Vive aquí y no en una ruta porque se monta en dos
 * pestañas: desde Hoy (/routine/[id]) y desde Mi plan (/workouts/[id]). Cada
 * una la empuja en su propio stack, así que volver atrás devuelve a la pestaña
 * desde la que se entró y no a la otra. */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: routine, isLoading, error, refetch } = useRoutine(id);
  const startWorkout = useWorkoutStore((s) => s.start);

  // Sin comprobar plan: a esta pantalla solo llega quien ha pasado la puerta
  // de acceso de las pestañas (cliente activo y pagado).

  if (isLoading) return <Text style={styles.loading}>Cargando…</Text>;
  // Cargando y "ha fallado" son estados distintos: antes los dos pintaban
  // "Cargando…", así que un fallo se quedaba girando para siempre.
  if (error || !routine) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>{routine.title}</Text>
        <DifficultyBadge difficulty={routine.difficulty} />
      </View>
      <Text style={styles.description}>{routine.description}</Text>
      <Text style={styles.meta}>⏱ {routine.duration_minutes} min</Text>

      <Text style={styles.section}>Ejercicios</Text>
      {routine.exercises.map((ex) => {
        const suggestion = routine.weight_suggestions?.find((s) => s.exercise_id === ex.id);
        return (
          <Card key={ex.id}>
            <Text style={styles.exName}>{ex.name}</Text>
            <Text style={styles.exMeta}>
              {ex.reps
                ? `${ex.sets ? `${ex.sets} × ` : ""}${ex.reps}${ex.measure === "seconds" ? " (reps o seg.)" : ""}`
                : ex.duration_seconds
                  ? `${ex.duration_seconds} s`
                  : ""}
            </Text>
            {ex.description && <Text style={styles.exDesc}>{ex.description}</Text>}
            {ex.technique_video_url && (
              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(ex.technique_video_url!)}
                accessibilityRole="link"
                accessibilityLabel={`Ver el vídeo de técnica de ${ex.name}`}
                style={({ pressed }) => [styles.videoLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.videoLinkText}>Ver técnica</Text>
              </Pressable>
            )}
            {suggestion && (
              <Text style={styles.suggestion}>
                💡 Sugerencia: {suggestion.suggested_weight_kg}kg (la última vez, {suggestion.last_weight_kg}kg,
                se sintió fácil)
              </Text>
            )}
          </Card>
        );
      })}

      <Button
        title="Empezar entrenamiento"
        onPress={() => {
          startWorkout(routine);
          router.push({ pathname: "/workout/[routineId]", params: { routineId: routine.id } });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { ...typo.body, padding: spacing.xl, textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { ...typo.display, color: colors.textPrimary, flex: 1 },
  description: { ...typo.body, color: colors.textSecondary },
  meta: { ...typo.meta, color: colors.textSecondary },
  section: { ...typo.section, color: colors.textPrimary },
  exName: { ...typo.cardTitle, color: colors.textPrimary },
  exMeta: { ...typo.meta, color: colors.primaryText, marginTop: 2 },
  exDesc: { ...typo.meta, color: colors.textSecondary, marginTop: spacing.xs },
  videoLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  videoLinkText: { ...typo.meta, fontWeight: "600", color: colors.primaryText },
  suggestion: { ...typo.meta, color: colors.primaryText, fontWeight: "600", marginTop: spacing.xs },
});
