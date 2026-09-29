/** Design tokens — sección 7 del blueprint
 *
 * Accesibilidad: el naranja de marca no da contraste suficiente ni como texto
 * ni bajo texto blanco (2,83:1 en ambos sentidos, AA pide 4,5:1). En vez de
 * cambiar la marca, se separan tres papeles del color:
 *
 *   primary      → RELLENO (fondo de botón, badge, barra, borde). Intacto.
 *   primaryText  → el naranja cuando es TEXTO o icono sobre fondo claro.
 *   onFill       → el texto que va ENCIMA de un relleno de color.
 */
export const colors = {
  primary: "#FF6B35",
  /** 5,18:1 sobre blanco y 4,76:1 sobre el melocotón #FFF3ED de los chips. */
  primaryText: "#C2410C",
  /** 6,14:1 sobre primary, y también AA sobre los tres colores de dificultad
   *  (6,06 en BEGINNER · 7,93 en INTERMEDIATE · 4,56 en ADVANCED). */
  onFill: "#1A1A1A",
  secondary: "#004E89",
  accent: "#F7B801",
  background: "#FFFFFF",
  surface: "#F8F8F8",
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  /** 4,54:1 sobre blanco. Antes #999999, que daba 2,85:1. */
  textMuted: "#767676",
  border: "#DDDDDD",
  success: "#2ECC71",
  /** 5,01:1 sobre blanco y 4,80:1 sobre el verde #f0fdf4 de la tarjeta hecha.
   *  El success de marca daba 2,10:1 y 2,01:1 — era el peor de toda la app. */
  successText: "#15803D",
  warning: "#F39C12",
  /** 5,02:1 sobre blanco. El warning de marca da 2,15:1 como texto: vale de
   *  borde o relleno, no para leer el aviso. */
  warningText: "#B45309",
  danger: "#E74C3C",
  /** 6,47:1 sobre blanco. El danger de marca daba 3,82:1: por debajo de AA justo
   *  en los mensajes de error, que son el texto que más falta hace leer. */
  dangerText: "#B91C1C",
  difficulty: {
    BEGINNER: "#27AE60",
    INTERMEDIATE: "#F39C12",
    ADVANCED: "#E74C3C",
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, full: 9999 } as const;
