import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DaySchedule } from "@truerep/shared";

/** Rutinas de hoy del programa asignado. Devuelve null si no es Premium o no tiene programa. */
export function useSchedule(enabled: boolean) {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      try {
        return await api<DaySchedule | null>("/me/schedule");
      } catch {
        return null; // 402 (no premium) o sin programa — no es un error para la UI
      }
    },
    enabled,
    retry: false,
  });
}
