import { AccessibilityInfo, LayoutAnimation } from "react-native";

// ponytail: una bandera de módulo en vez de un hook por componente; basta con
// que el siguiente cambio de layout sepa si el usuario pidió menos movimiento.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
  reduceMotion = v;
});

/** Anima el siguiente cambio de layout (abrir/cerrar una tarjeta) para que el
 * contenido se desplace en vez de saltar. Con "reducir movimiento" el cambio es
 * instantáneo. Solo opacidad y posición, sin rebote: no lo provoca un gesto. */
export function animateNextLayout() {
  if (reduceMotion) return;
  LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
}
