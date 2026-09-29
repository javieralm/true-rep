import { View, Text, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { colors, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

/** Un fallo de carga con salida. Sin esto, las pantallas de detalle se quedaban
 * en "Cargando…" para siempre cuando la petición fallaba: sin explicación, sin
 * reintento y sin forma de saber que no iba a llegar nunca. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  // El mensaje del servidor solo si viene de la API y dice algo. Un fallo de red
  // ya trae su propio texto; cualquier otra excepción no es para enseñarla.
  const message =
    error instanceof ApiError ? error.message : "No hemos podido cargar esta información.";

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <Button title="Reintentar" variant="outline" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: { ...typo.body, color: colors.textSecondary, textAlign: "center" },
});
