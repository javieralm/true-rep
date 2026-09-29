import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  // Igual que en (tabs): la espera a isLoaded está en el layout raíz, así que
  // isSignedIn=false aquí significa "no hay sesión", no "aún no se sabe". Eso
  // es lo que quitaba el parpadeo del login en cada arranque en frío.
  if (isSignedIn) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
