import { Image, ScrollView, Text, View, StyleSheet, RefreshControl } from "react-native";
import { usePlan } from "@/hooks/usePlan";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useRefresh } from "@/hooks/useRefresh";
import { PlanTask } from "@/components/workout/PlanTask";
import { Card } from "@/components/ui/Card";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

const DAY_NAME = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** La relación con el entrenador en un sitio: quién es, lo que te ha enviado
 * y lo que opina de tus entrenos. Es lo que paga el cliente. */
export default function CoachScreen() {
  const { refreshing, onRefresh } = useRefresh();
  const { data: plan, isLoading, error } = usePlan(true);
  const { data: history } = useWorkoutHistory(10);
  const feedback = (history ?? []).filter((w) => w.trainer_feedback);
  const trainer = plan?.trainer;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >
      {trainer ? (
        <View style={styles.profile}>
          {trainer.avatar_url ? (
            <Image source={{ uri: trainer.avatar_url }} style={styles.avatar} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.initial}>{trainer.username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.label}>Tu entrenador</Text>
            <Text style={styles.name}>{trainer.username}</Text>
            <Text style={styles.meta}>{plan.program_name}</Text>
          </View>
        </View>
      ) : error ? (
        <Text style={styles.error}>No hemos podido cargar a tu entrenador. Desliza hacia abajo para reintentar.</Text>
      ) : isLoading ? (
        <Text style={styles.empty}>Cargando…</Text>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aún no tienes programa</Text>
          <Text style={styles.emptyText}>
            Cuando tu entrenador te asigne un programa, aquí verás sus mensajes y su opinión sobre tus entrenos.
          </Text>
        </Card>
      )}

      {plan && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensajes</Text>
          {plan.messages.length === 0 ? (
            <Text style={styles.empty}>Todavía no te ha enviado nada.</Text>
          ) : (
            plan.messages.map((m, i) => (
              <View key={i} style={styles.message}>
                <Text style={styles.when}>
                  Semana {m.week} · {DAY_NAME[m.day - 1]}
                </Text>
                <PlanTask task={{ type: m.type, order: i, data: m.data }} onOpenRoutine={() => {}} />
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre tus entrenos</Text>
        {feedback.length === 0 ? (
          <Text style={styles.empty}>
            Cuando tu entrenador revise un entrenamiento, su comentario aparecerá aquí.
          </Text>
        ) : (
          feedback.map((w) => (
            <Card key={w.id} style={styles.feedback}>
              <Text style={styles.feedbackTitle}>{w.routine?.title ?? "Entrenamiento"}</Text>
              <Text style={styles.when}>{new Date(w.completed_at).toLocaleDateString("es-ES")}</Text>
              <Text style={styles.feedbackText}>{w.trainer_feedback}</Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.xl },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  initial: { ...typo.title, color: colors.onFill },
  profileText: { flex: 1, gap: 2 },
  label: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  name: { ...typo.title, color: colors.textPrimary },
  meta: { ...typo.meta, color: colors.textSecondary },
  section: { gap: spacing.sm },
  sectionTitle: { ...typo.section, color: colors.textPrimary },
  message: { gap: spacing.xs },
  when: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  feedback: { gap: 2, borderRadius: radius.md },
  feedbackTitle: { ...typo.cardTitle, color: colors.textPrimary },
  feedbackText: { ...typo.body, color: colors.textPrimary, marginTop: spacing.xs },
  empty: { ...typo.meta, color: colors.textMuted },
  error: { ...typo.meta, color: colors.dangerText },
  emptyCard: { gap: spacing.sm },
  emptyTitle: { ...typo.cardTitle, color: colors.textPrimary },
  emptyText: { ...typo.meta, color: colors.textSecondary },
});
