import { ScrollView, Text, View, StyleSheet, Switch, Pressable, RefreshControl } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { useAccess } from "@/hooks/useAccess";
import { useBilling } from "@/hooks/useBilling";
import { useAchievements } from "@/hooks/useAchievements";
import { useRefresh } from "@/hooks/useRefresh";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";

export default function ProfileScreen() {
  const { refreshing, onRefresh } = useRefresh();
  const { signOut } = useAuth();
  const { data: user } = useUser();
  const { data: achievements } = useAchievements(user?.id);
  const unlocked = achievements?.filter((a) => a.unlocked_at) ?? [];

  const { data: access } = useAccess();
  const { billing, portal } = useBilling(access?.billing === "STRIPE");

  const qc = useQueryClient();
  const updatePrefs = useMutation({
    mutationFn: (prefs: { reminder_enabled?: boolean; reminder_hour?: number }) =>
      api("/me/preferences", { method: "PATCH", body: JSON.stringify(prefs) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
  const reminderHour = user?.reminder_hour ?? 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />
      }
    >
      <Card style={styles.header}>
        <Text style={styles.username}>{user?.username ?? "…"}</Text>
        <Text style={styles.meta}>
          {user?.xp ?? 0} XP · {user?.streak ?? 0} {user?.streak === 1 ? "día" : "días"} de racha
        </Text>
      </Card>

      {access?.trainer && (
        <Card style={styles.planCard}>
          <Text style={styles.section}>Tu entrenador: {access.trainer.username}</Text>
          <Text style={styles.meta}>
            {access.billing === "CASH"
              ? access.paid_until
                ? `Pagas en efectivo · acceso hasta el ${new Date(access.paid_until).toLocaleDateString("es-ES")}`
                : "Pagas en efectivo a tu entrenador"
              : billing.data?.subscription?.current_period_end
                ? `Pagas con tarjeta · se renueva el ${new Date(billing.data.subscription.current_period_end).toLocaleDateString("es-ES")}`
                : "Pagas con tarjeta a tu entrenador"}
          </Text>
          {billing.data?.subscription && (
            <Button
              title={portal.isPending ? "Abriendo…" : "Gestionar pago"}
              variant="outline"
              onPress={() => portal.mutate()}
              disabled={portal.isPending}
            />
          )}
          {portal.error && <Text style={styles.error}>{portal.error.message}</Text>}
        </Card>
      )}

      <Card style={styles.planCard}>
        <View style={styles.prefRow}>
          <Text style={styles.section}>Recordatorio diario</Text>
          <Switch
            value={user?.reminder_enabled ?? true}
            onValueChange={(v) => updatePrefs.mutate({ reminder_enabled: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>
        {(user?.reminder_enabled ?? true) && (
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Hora del recordatorio</Text>
            <View style={styles.hourStepper}>
              <Pressable
                onPress={() => updatePrefs.mutate({ reminder_hour: (reminderHour + 23) % 24 })}
                style={styles.hourBtn}
              >
                <Text style={styles.hourBtnText}>−</Text>
              </Pressable>
              <Text style={styles.hourValue}>{String(reminderHour).padStart(2, "0")}:00</Text>
              <Pressable
                onPress={() => updatePrefs.mutate({ reminder_hour: (reminderHour + 1) % 24 })}
                style={styles.hourBtn}
              >
                <Text style={styles.hourBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.section}>Logros ({unlocked.length}/{achievements?.length ?? 0})</Text>
      <View style={styles.badges}>
        {(achievements ?? []).map((a) => (
          <Card
            key={a.id}
            style={[styles.badge, !a.unlocked_at && { opacity: 0.35 }]}
            accessibilityLabel={`${a.name}: ${a.unlocked_at ? "desbloqueado" : "bloqueado"}`}
          >
            <Text style={styles.badgeName}>
              {a.name}
              {!a.unlocked_at ? " (bloqueado)" : ""}
            </Text>
            <Text style={styles.badgeDesc}>{a.description}</Text>
          </Card>
        ))}
      </View>

      <Button title="Cerrar sesión" variant="outline" onPress={() => signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: "center", gap: spacing.sm },
  planCard: { gap: spacing.sm },
  prefRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prefLabel: { fontSize: 14, color: colors.textSecondary },
  hourStepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hourBtn: {
    minWidth: 44,
    minHeight: 44, // accesibilidad: touch target mínimo
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  hourBtnText: { fontSize: 18, color: colors.textPrimary },
  hourValue: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, minWidth: 52, textAlign: "center" },
  username: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 14, color: colors.textSecondary },
  error: { fontSize: 14, color: colors.dangerText },
  section: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  badges: { gap: spacing.sm },
  badge: { paddingVertical: spacing.md },
  badgeName: { fontWeight: "600", color: colors.textPrimary },
  badgeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
