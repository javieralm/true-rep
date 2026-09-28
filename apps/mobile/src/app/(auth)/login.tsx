import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    if (!isLoaded) return;
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hemos podido iniciar sesión");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        True<Text style={{ color: colors.primary }}>Rep</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.textMuted}
        autoComplete="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Iniciar sesión" onPress={onLogin} />
      <Link href="/(auth)/signup" style={styles.link}>
        ¿No tienes cuenta? Regístrate
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  // 32px pide tracking negativo: a este tamaño las letras se leen demasiado
  // separadas si mantienen el tracking del cuerpo de texto.
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...typo.body,
    fontSize: 16,
    color: colors.textPrimary,
  },
  error: { ...typo.meta, color: colors.danger },
  // Enlace con altura de touch target real: antes era solo la caja del texto (~20px).
  link: {
    ...typo.body,
    textAlign: "center",
    color: colors.secondary,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
});
