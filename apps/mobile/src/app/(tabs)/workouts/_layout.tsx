import { Stack } from "expo-router";

/** Stack propio de la pestaña Rutinas: el detalle se empuja aquí dentro, no
 * como modal sobre toda la app. Así la barra de pestañas sigue visible, el
 * gesto de vuelta es el de borde nativo y la cabecera dice de dónde vienes. */
export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Rutinas" }} />
      <Stack.Screen name="[id]" options={{ title: "Rutina" }} />
    </Stack>
  );
}
