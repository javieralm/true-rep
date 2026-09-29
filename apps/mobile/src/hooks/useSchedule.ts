import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { DaySchedule } from "@truerep/shared";

/** Rutinas de hoy del programa asignado. Devuelve null si no es Premium o no tiene programa. */
export function useSchedule(enabled: boolean) {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      try {
        // ok(null) cuando no hay programa asignado: respuesta válida, llega
        // como null sin pasar por aquí.
        return await api<DaySchedule | null>("/me/schedule");
      } catch (e) {
        // 402 = el plan no incluye programas. Para la UI eso es "hoy no hay
        // plan", no un fallo. Lo demás (red, timeout, 500) sí es un error y
        // tiene que llegar a la pantalla en vez de disfrazarse de "sin plan",
        // que es lo que hacía el catch vacío de antes.
        if (e instanceof ApiError && e.status === 402) return null;
        throw e;
      }
    },
    enabled,
    retry: false,
  });
}
