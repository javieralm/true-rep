import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { Button } from "@/components/ui/Button";
import { colors, spacing, radius } from "@/constants/colors";

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
      setError(e instanceof Error ? e.message : "Sign in failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        True<Text style={{ color: colors.primary }}>Rep</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Sign In" onPress={onLogin} />
      <Link href="/(auth)/signup" style={styles.link}>
        No account? Sign up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", marginBottom: spacing.xl },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13 },
  link: { textAlign: "center", color: colors.secondary, marginTop: spacing.md },
});
