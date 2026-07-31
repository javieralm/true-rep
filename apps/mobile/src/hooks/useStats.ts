import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MeStats } from "@truerep/shared";

/** Estadísticas de progreso. Requiere suscripción activa (402 si free). */
export function useStats(enabled: boolean) {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api<MeStats>("/me/stats"),
    enabled,
    retry: false,
  });
}
