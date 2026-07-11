import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@/constants/colors";

// ponytail: emojis como iconos de tab; cambiar a @expo/vector-icons al pulir UI
function icon(emoji: string) {
  return () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts", tabBarIcon: icon("💪") }} />
      <Tabs.Screen name="challenges" options={{ title: "Challenges", tabBarIcon: icon("🏆") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("👤") }} />
    </Tabs>
  );
}
