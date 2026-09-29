import { Stack } from "expo-router";

/** Retos cuelga de aquí y no de su propia pestaña: son una forma más de ver
 * cómo vas, y la barra se queda en cinco pestañas. */
export default function ProgressLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Progreso" }} />
      <Stack.Screen name="challenges/index" options={{ title: "Retos" }} />
      <Stack.Screen name="challenges/[id]" options={{ title: "Reto" }} />
    </Stack>
  );
}
