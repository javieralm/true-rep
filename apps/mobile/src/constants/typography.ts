import type { TextStyle } from "react-native";

/** Escala tipográfica: tracking y leading son específicos del tamaño, no un
 * valor único para todo. El texto grande se lee demasiado separado si mantiene
 * el tracking del cuerpo, así que va en negativo; el texto pequeño gana
 * legibilidad con tracking ligeramente positivo. Leading al revés: apretado en
 * titulares, holgado en cuerpo. */
export const type = {
  /** Saludo / titular de pantalla */
  display: { fontSize: 26, lineHeight: 29, letterSpacing: -0.5, fontWeight: "700" },
  /** Título de pantalla o modal */
  title: { fontSize: 22, lineHeight: 26, letterSpacing: -0.4, fontWeight: "700" },
  /** Cabecera de sección */
  section: { fontSize: 18, lineHeight: 23, letterSpacing: -0.2, fontWeight: "600" },
  /** Título de tarjeta / item de lista */
  cardTitle: { fontSize: 16, lineHeight: 21, letterSpacing: -0.1, fontWeight: "600" },
  /** Cuerpo de texto */
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  /** Meta/subtítulo bajo un título */
  meta: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  /** Etiqueta pequeña, badge, caption */
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: "600" },
  /** Cifra destacada (XP, racha, nivel): leading mínimo, tracking negativo */
  stat: { fontSize: 22, lineHeight: 24, letterSpacing: -0.6, fontWeight: "700" },
} satisfies Record<string, TextStyle>;
