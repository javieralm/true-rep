import { Pressable, Text, StyleSheet, type PressableProps } from "react-native";
import { colors, radius, spacing } from "@/constants/colors";

interface Props extends PressableProps {
  title: string;
  variant?: "primary" | "outline";
}

export function Button({ title, variant = "primary", disabled, ...rest }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.outline,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
      disabled={disabled}
      accessibilityRole="button"
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
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
