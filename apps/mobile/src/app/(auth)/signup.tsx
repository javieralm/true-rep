import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/constants/colors";

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
      setError(e instanceof Error ? e.message : "Sign up failed");
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
      setError(e instanceof Error ? e.message : "Verification failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      {!pendingVerification ? (
        <>
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign Up" onPress={onSignUp} />
          <Link href="/(auth)/login" style={styles.link}>
            Already have an account? Sign in
          </Link>
        </>
      ) : (
        <>
          <Text>Enter the code we emailed you.</Text>
          <TextInput style={styles.input} placeholder="Verification code" keyboardType="number-pad" value={code} onChangeText={setCode} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Verify" onPress={onVerify} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13 },
  link: { textAlign: "center", color: colors.secondary, marginTop: spacing.md },
});
