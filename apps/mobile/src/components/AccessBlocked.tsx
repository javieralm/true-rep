import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import type { AccessState, MyAccess } from "@truerep/shared";
import { Button } from "@/components/ui/Button";
import { priceLabel, useBilling } from "@/hooks/useBilling";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

const COPY: Record<Exclude<AccessState, "active">, { title: string; body: (trainer?: string) => string }> = {
  no_invitation: {
    title: "Necesitas una invitación",
    body: () =>
      "TrueRep es para clientes de un entrenador. Pídele a tu entrenador que te invite con este email y vuelve a entrar.",
  },
  paused: {
    title: "Tu acceso está pausado",
    body: (t) => `${t ?? "Tu entrenador"} ha pausado tu acceso. Habla con él para reactivarlo.`,
  },
  payment_required: {
    title: "Pago pendiente",
    body: (t) => `Tu acceso ha vencido. Renueva el pago con ${t ?? "tu entrenador"} para seguir entrenando.`,
  },
  ended: {
    title: "Ya no tienes entrenador",
    body: () => "Tu relación con tu entrenador ha terminado. Si empiezas con otro, pídele que te invite.",
  },
};

/** Lo que ve quien ha iniciado sesión pero no puede entrenar. Siempre con
 * salida: reintentar (el entrenador puede haberle activado ya) o cambiar de
 * cuenta, por si entró con otro email distinto al invitado. */
export function AccessBlocked({
  access,
  onRetry,
  retrying,
}: {
  access: MyAccess | undefined;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { signOut } = useAuth();
  const state = access && access.state !== "active" ? access.state : "no_invitation";
  const copy = COPY[state];
  // Paga por Stripe: puede pagar desde aquí, eligiendo entre los precios de su entrenador.
  const payByCard = state === "payment_required" && access?.billing === "STRIPE";
  const { billing, checkout } = useBilling(payByCard);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body(access?.trainer?.username)}</Text>
      {payByCard && billing.data?.can_subscribe && (
        <View style={styles.actions}>
          {billing.data.prices.map((p) => (
            <Button
              key={p.interval}
              title={checkout.isPending && checkout.variables === p.interval ? "Abriendo el pago…" : `Pagar ${priceLabel(p)}`}
              onPress={() => checkout.mutate(p.interval)}
              disabled={checkout.isPending}
            />
          ))}
        </View>
      )}
      {payByCard && billing.data && !billing.data.can_subscribe && (
        <Text style={styles.body}>Tu entrenador aún no ha activado el pago con tarjeta. Avísale.</Text>
      )}
      {checkout.error && <Text style={styles.error}>{checkout.error.message}</Text>}
      <View style={styles.actions}>
        <Button
          title={retrying ? "Comprobando…" : "Volver a comprobar"}
          variant={payByCard ? "outline" : "primary"}
          onPress={onRetry}
          disabled={retrying}
        />
        <Button title="Entrar con otra cuenta" variant="outline" onPress={() => signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { ...typo.display, color: colors.textPrimary, textAlign: "center" },
  body: { ...typo.body, color: colors.textSecondary, textAlign: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  error: { ...typo.body, color: colors.dangerText, textAlign: "center" },
});
