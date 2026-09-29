import { Stack } from "expo-router";

/** Sin pantallas de detalle todavía, pero con Stack igual: es quien pone la
 * cabecera ahora que las Tabs no la ponen. */
export default function ProgressLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Progreso" }} />
    </Stack>
  );
}
