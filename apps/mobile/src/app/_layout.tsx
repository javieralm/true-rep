import { useEffect } from "react";
import { Stack } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerTokenGetter } from "@/lib/api";

const queryClient = new QueryClient();

function AuthTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <AuthTokenBridge />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="routine-detail" options={{ presentation: "modal", headerShown: true, title: "Routine" }} />
          <Stack.Screen name="workout-session" options={{ presentation: "modal", headerShown: true, title: "Workout" }} />
          <Stack.Screen name="challenge-detail" options={{ presentation: "modal", headerShown: true, title: "Challenge" }} />
          <Stack.Screen name="feedback-camera" options={{ presentation: "modal", headerShown: true, title: "Form Feedback" }} />
        </Stack>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
