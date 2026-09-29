import { Stack } from "expo-router";

/** (today) es un grupo, no un segmento: así su index sigue siendo "/".
 *
 * Solo esta pestaña puede permitírselo. Si dos grupos tuvieran index, los dos
 * resolverían a "/" y en un enlace en frío Expo Router elegiría el primero por
 * orden alfabético. Las otras cuatro pestañas usan segmentos reales
 * (/workouts, /progress…) justamente para no caer en esa ambigüedad. */
export default function TodayLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Hoy" }} />
      <Stack.Screen name="routine/[id]" options={{ title: "Rutina" }} />
    </Stack>
  );
}
