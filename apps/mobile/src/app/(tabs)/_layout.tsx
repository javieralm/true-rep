import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import type { ColorValue } from "react-native";
import { registerForPushNotifications } from "@/lib/push";
import { colors } from "@/constants/colors";

// ColorValue y no string: desde SDK 57 el tabBarIcon recibe el color como
// ColorValue, que admite también OpaqueColorValue (colores de plataforma).
function icon(name: keyof typeof Ionicons.glyphMap) {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) void registerForPushNotifications();
  }, [isSignedIn]);

  // Sin comprobar isLoaded: el layout raíz no monta nada hasta que Clerk ha
  // cargado, así que aquí isSignedIn ya es una respuesta, no un "todavía no sé".
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;

  return (
    // Etiquetas por su contenido ("Hoy", "Rutinas"), no paraguas genéricos
    // ("Home"): el usuario predice mejor lo que hay detrás de cada pestaña.
    //
    // headerShown: false porque cada pestaña es ahora un Stack y es él quien
    // pone la cabecera. Con las dos activas salían dos cabeceras apiladas, y
    // es el Stack el que sabe el título de la pantalla en la que estás y de
    // dónde vienes.
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="(today)" options={{ title: "Hoy", tabBarIcon: icon("today") }} />
      <Tabs.Screen name="workouts" options={{ title: "Rutinas", tabBarIcon: icon("barbell") }} />
      <Tabs.Screen name="progress" options={{ title: "Progreso", tabBarIcon: icon("trending-up") }} />
      <Tabs.Screen name="challenges" options={{ title: "Retos", tabBarIcon: icon("trophy") }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarIcon: icon("person") }} />
    </Tabs>
  );
}
