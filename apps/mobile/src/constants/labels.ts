import type { Difficulty } from "@truerep/shared";

/** Los valores del enum (`BEGINNER`) son jerga interna: nunca se muestran
 * crudos en la UI. Mismo criterio que el dashboard, que ya usa estos términos. */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};
