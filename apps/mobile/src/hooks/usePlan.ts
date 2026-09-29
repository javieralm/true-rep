import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ClientPlan } from "@truerep/shared";

/** Plan asignado por el entrenador: semana actual, entrenador y sus mensajes.
 * null = no hay programa asignado (o el plan no incluye programas: 402). */
export function usePlan(enabled: boolean) {
  return useQuery({
    queryKey: ["plan"],
    queryFn: async () => {
      try {
        return await api<ClientPlan | null>("/me/plan");
      } catch (e) {
        if (e instanceof ApiError && e.status === 402) return null;
        throw e;
      }
    },
    enabled,
    retry: false,
  });
}
