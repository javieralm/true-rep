import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { registerForPushNotifications } from "@/lib/push";
import { colors } from "@/constants/colors";

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isSignedIn) void registerForPushNotifications();
  }, [isSignedIn]);

  if (isLoaded && !isSignedIn) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts", tabBarIcon: icon("barbell") }} />
      <Tabs.Screen name="progress" options={{ title: "Progreso", tabBarIcon: icon("trending-up") }} />
      <Tabs.Screen name="challenges" options={{ title: "Challenges", tabBarIcon: icon("trophy") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person") }} />
    </Tabs>
  );
}
