import { Redirect } from "expo-router";

/** Ya no hay pantalla de registro aparte: login.tsx crea la cuenta sola si el
 * correo no existe. Se mantiene la ruta como redirección para no romper
 * enlaces antiguos ni la navegación de vuelta. */
export default function SignupScreen() {
  return <Redirect href="/(auth)/login" />;
}
