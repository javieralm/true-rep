import { Pressable, Text, StyleSheet, type PressableProps } from "react-native";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

interface Props extends PressableProps {
  title: string;
  variant?: "primary" | "outline";
}

export function Button({ title, variant = "primary", disabled, ...rest }: Props) {
  return (
    <Pressable
      // Pulsado y deshabilitado son estados distintos y se ven distintos: con
      // la misma opacidad para los dos, un botón deshabilitado parecía estar
      // pulsándose todo el rato.
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
    >
      <Text style={[styles.text, variant === "outline" && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44, // accesibilidad: touch target mínimo
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
  // Respuesta al apoyar el dedo: se hunde un poco, como algo físico.
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  text: { ...typo.cardTitle, color: "#fff" },
});
