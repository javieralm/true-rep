import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignUp() {
    if (!isLoaded) return;
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hemos podido crear la cuenta");
    }
  }

  async function onVerify() {
    if (!isLoaded) return;
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hemos podido verificar el código");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crea tu cuenta</Text>
      {!pendingVerification ? (
        <>
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
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Crear cuenta" onPress={onSignUp} />
          <Link href="/(auth)/login" style={styles.link}>
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </>
      ) : (
        <>
          <Text style={styles.body}>Introduce el código que te hemos enviado por correo.</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            placeholderTextColor={colors.textMuted}
            autoComplete="one-time-code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Verificar" onPress={onVerify} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  title: { ...typo.display, color: colors.textPrimary, textAlign: "center", marginBottom: spacing.lg },
  body: { ...typo.body, color: colors.textSecondary },
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
