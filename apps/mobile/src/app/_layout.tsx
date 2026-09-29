import { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { registerTokenGetter } from "@/lib/api";
import { colors } from "@/constants/colors";

const queryClient = new QueryClient();

/** React Query solo sabe de "foco" de ventana, que en el navegador existe y en
 * React Native no: sin esto no refresca nunca al volver a la app. Importa sobre
 * todo al volver de las páginas de Stripe, donde el plan cambia fuera de la app
 * y el webhook puede llegar después de que el usuario cierre el navegador. */
function useRefetchOnForeground() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => sub.remove();
  }, []);
}

function AuthTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

/** Guarda única de arranque: nada se monta hasta que Clerk sabe si hay sesión.
 *
 * Antes cada grupo decidía por su cuenta y ninguno esperaba a isLoaded, así que
 * en cada arranque en frío pasaban dos cosas: (auth) veía isSignedIn=false
 * mientras cargaba y pintaba el login un instante aunque la sesión fuera válida,
 * y (tabs) montaba el dashboard y lanzaba /users/me sin token, que devolvía 401
 * y React Query reintentaba tres veces.
 *
 * Con la espera aquí, los Redirect de (auth) y (tabs) ya solo deciden a dónde
 * ir, nunca si la respuesta se conoce todavía. */
function RootNavigator() {
  const { isLoaded } = useAuth();
  useRefetchOnForeground();

  if (!isLoaded) {
    // Del color del splash, para que la espera no se vea como un parpadeo.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Solo queda a este nivel lo que de verdad interrumpe. Los detalles de
          rutina y de reto se empujan dentro del stack de su pestaña, que es
          navegación jerárquica, no una interrupción. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      {/* La sesión no es una hoja descartable: es una experiencia continua.
          fullScreenModal y sin gesto de cierre; salir exige confirmar, que lo
          intercepta la propia pantalla con beforeRemove. */}
      <Stack.Screen
        name="workout/[routineId]"
        options={{
          presentation: "fullScreenModal",
          gestureEnabled: false,
          headerShown: true,
          title: "Entrenamiento",
        }}
      />
      <Stack.Screen name="feedback-camera" options={{ presentation: "modal", headerShown: true, title: "Análisis de técnica" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <AuthTokenBridge />
        <RootNavigator />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
