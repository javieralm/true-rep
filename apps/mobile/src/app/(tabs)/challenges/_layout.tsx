import { Stack } from "expo-router";

export default function ChallengesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Retos" }} />
      <Stack.Screen name="[id]" options={{ title: "Reto" }} />
    </Stack>
  );
}
