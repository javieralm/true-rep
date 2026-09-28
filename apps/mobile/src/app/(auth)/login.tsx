import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSignIn, useSignUp, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

/** Pantalla única de acceso: no distingue entre entrar y registrarse.
 *
 * Se pide el correo y se manda un código de 6 dígitos. Si la cuenta existe se
 * inicia sesión; si no, se crea. El usuario no tiene que saber en cuál de los
 * dos casos está, ni inventarse una contraseña (la instancia exige 15
 * caracteres, que en una prueba nadie va a teclear). */
export default function LoginScreen() {
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // null = aún pidiendo el correo; luego recordamos por qué vía se mandó el
  // código, porque verificarlo usa una llamada distinta en cada caso.
  const [sent, setSent] = useState<"signIn" | "signUp" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cierra la sesión del navegador si quedó una a medias de un intento previo.
  useEffect(() => {
    void WebBrowser.maybeCompleteAuthSession();
  }, []);

  const isLoaded = signInLoaded && signUpLoaded;

  async function sendCode() {
    if (!isLoaded || busy) return;
    const target = email.trim();
    if (!target) return setError("Escribe tu correo");
    setBusy(true);
    setError(null);
    try {
      // Primero se intenta como cuenta existente.
      const attempt = await signIn.create({ identifier: target });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor || !("emailAddressId" in factor)) {
        throw new Error("Esta cuenta no admite acceso por código");
      }
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      setSent("signIn");
    } catch {
      // No existe: se crea. Se hace en el catch a propósito — Clerk no ofrece
      // una forma de preguntar "¿existe este correo?" sin exponer si alguien
      // está registrado, que es justo lo que su protección anti-enumeración
      // evita.
      try {
        await signUp.create({ emailAddress: target });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setSent("signUp");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No hemos podido enviarte el código");
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!isLoaded || busy || !sent) return;
    setBusy(true);
    setError(null);
    try {
      if (sent === "signIn") {
        const res = await signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
        if (res.status === "complete") {
          await setSignInActive({ session: res.createdSessionId });
          router.replace("/(tabs)");
        } else {
          setError("El código no es válido");
        }
      } else {
        const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === "complete") {
          await setSignUpActive({ session: res.createdSessionId });
          router.replace("/(tabs)");
        } else {
          setError("El código no es válido");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "El código no es válido");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
      // Sin createdSessionId el usuario canceló: no es un error que mostrar.
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hemos podido entrar con Google");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        True<Text style={{ color: colors.primary }}>Rep</Text>
      </Text>

      {sent === null ? (
        <>
          <Pressable
            onPress={withGoogle}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.google, pressed && styles.pressed, busy && styles.disabled]}
          >
            <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
            <Text style={styles.googleText}>Continuar con Google</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>o con tu correo</Text>
            <View style={styles.divider} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title={busy ? "Enviando…" : "Enviarme un código"} onPress={sendCode} disabled={busy} />
          <Text style={styles.hint}>
            Sin contraseñas: te mandamos un código de 6 dígitos. Si es tu primera vez, te creamos la cuenta.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.sentTo}>Código enviado a {email.trim()}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.textMuted}
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            editable={!busy}
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title={busy ? "Comprobando…" : "Entrar"} onPress={verifyCode} disabled={busy} />
          <Pressable
            onPress={() => {
              setSent(null);
              setCode("");
              setError(null);
            }}
            style={styles.backRow}
          >
            <Text style={styles.backText}>Usar otro correo</Text>
          </Pressable>
        </>
      )}

      {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44, // accesibilidad: touch target mínimo
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  googleText: { ...typo.cardTitle, color: colors.textPrimary },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typo.meta, color: colors.textMuted },
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
  hint: { ...typo.meta, color: colors.textMuted, textAlign: "center" },
  sentTo: { ...typo.body, color: colors.textSecondary, textAlign: "center" },
  backRow: { minHeight: 44, justifyContent: "center" },
  backText: { ...typo.body, color: colors.secondary, textAlign: "center" },
});
