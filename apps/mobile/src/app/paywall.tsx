import { ScrollView, Text, View, StyleSheet } from "react-native";
import { PLAN_FEATURES } from "@truerep/shared";
import { useUser } from "@/hooks/useUser";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";

const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €/mes`;

export default function PaywallScreen() {
  const { data: user } = useUser();
  const { startCheckout, openPortal } = useSubscription();

  const isActive = user?.subscription_status === "ACTIVE";
  const plan = user?.subscription_plan;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={styles.heading}>Elige tu plan</Text>

      {(["BASE", "PREMIUM"] as const).map((tier) => {
        const info = PLAN_FEATURES[tier];
        const isCurrent = isActive && plan === tier;
        return (
          <Card key={tier} style={[styles.plan, tier === "PREMIUM" && styles.highlight]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{info.name}</Text>
              {tier === "PREMIUM" && <Text style={styles.badge}>RECOMENDADO</Text>}
            </View>
            <Text style={styles.price}>{euro(info.price_eur_month)}</Text>
            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              {info.features.map((f) => (
                <Text key={f} style={styles.feature}>✓ {f}</Text>
              ))}
            </View>
            <View style={{ marginTop: spacing.md }}>
              {isCurrent ? (
                <Button title="Tu plan actual" variant="outline" disabled />
              ) : isActive ? (
                // Ya suscrito: cambios de plan vía Billing Portal
                <Button
                  title={tier === "PREMIUM" ? "Mejorar a Premium" : "Cambiar a Base"}
                  onPress={() => openPortal.mutate()}
                  disabled={openPortal.isPending}
                />
              ) : (
                <Button
                  title={`Empezar con ${info.name}`}
                  onPress={() => startCheckout.mutate(tier === "PREMIUM" ? "premium" : "base")}
                  disabled={startCheckout.isPending}
                />
              )}
            </View>
          </Card>
        );
      })}

      <Text style={styles.footnote}>
        Pago seguro con Stripe. Cancela cuando quieras desde tu perfil.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  heading: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  plan: { gap: spacing.xs },
  highlight: { borderWidth: 2, borderColor: colors.primary },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  badge: {
    backgroundColor: colors.primary,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  price: { fontSize: 28, fontWeight: "800", color: colors.primary },
  feature: { fontSize: 14, color: colors.textSecondary },
  footnote: { fontSize: 12, color: colors.textSecondary, textAlign: "center" },
});
