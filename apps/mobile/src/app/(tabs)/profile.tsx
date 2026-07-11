import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useUser } from "@/hooks/useUser";
import { useAchievements } from "@/hooks/useAchievements";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/constants/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: user } = useUser();
  const { data: achievements } = useAchievements(user?.id);
  const unlocked = achievements?.filter((a) => a.unlocked_at) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card style={styles.header}>
        <Text style={styles.username}>{user?.username ?? "…"}</Text>
        <Text style={styles.meta}>
          {user?.xp ?? 0} XP · 🔥 {user?.streak ?? 0} day streak ·{" "}
          {user?.subscription_status === "ACTIVE" ? "Premium ⭐" : "Free plan"}
        </Text>
      </Card>

      <Text style={styles.section}>Achievements ({unlocked.length}/{achievements?.length ?? 0})</Text>
      <View style={styles.badges}>
        {(achievements ?? []).map((a) => (
          <Card key={a.id} style={[styles.badge, !a.unlocked_at && { opacity: 0.35 }]}>
            <Text style={styles.badgeName}>{a.name}</Text>
            <Text style={styles.badgeDesc}>{a.description}</Text>
          </Card>
        ))}
      </View>

      {user?.subscription_status === "ACTIVE" && (
        <Button title="Get AI Form Feedback" onPress={() => router.push("/feedback-camera")} />
      )}
      <Button title="Sign Out" variant="outline" onPress={() => signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: "center", gap: spacing.sm },
  username: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 14, color: colors.textSecondary },
  section: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  badges: { gap: spacing.sm },
  badge: { paddingVertical: spacing.md },
  badgeName: { fontWeight: "600", color: colors.textPrimary },
  badgeDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
