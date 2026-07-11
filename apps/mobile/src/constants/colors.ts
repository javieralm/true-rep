/** Design tokens — sección 7 del blueprint */
export const colors = {
  primary: "#FF6B35",
  secondary: "#004E89",
  accent: "#F7B801",
  background: "#FFFFFF",
  surface: "#F8F8F8",
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  border: "#DDDDDD",
  success: "#2ECC71",
  warning: "#F39C12",
  danger: "#E74C3C",
  difficulty: {
    BEGINNER: "#27AE60",
    INTERMEDIATE: "#F39C12",
    ADVANCED: "#E74C3C",
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, full: 9999 } as const;
