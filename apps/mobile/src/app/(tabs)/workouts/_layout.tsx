import { Stack } from "expo-router";

/** Stack propio de la pestaña Mi plan: el detalle se empuja aquí dentro, no
 * como modal sobre toda la app. Así la barra de pestañas sigue visible, el
 * gesto de vuelta es el de borde nativo y la cabecera dice de dónde vienes. */
export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Mi plan" }} />
      <Stack.Screen name="[id]" options={{ title: "Rutina" }} />
    </Stack>
  );
}
