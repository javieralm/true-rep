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
    // Etiquetas por su contenido ("Hoy", "Rutinas"), no paraguas genéricos
    // ("Home"): el usuario predice mejor lo que hay detrás de cada pestaña.
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hoy", tabBarIcon: icon("today") }} />
      <Tabs.Screen name="workouts" options={{ title: "Rutinas", tabBarIcon: icon("barbell") }} />
      <Tabs.Screen name="progress" options={{ title: "Progreso", tabBarIcon: icon("trending-up") }} />
      <Tabs.Screen name="challenges" options={{ title: "Retos", tabBarIcon: icon("trophy") }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarIcon: icon("person") }} />
    </Tabs>
  );
}
