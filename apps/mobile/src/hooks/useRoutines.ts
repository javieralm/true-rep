import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Routine } from "@truerep/shared";

/** Una rutina concreta. Ya no hay listado de catálogo en la app: el cliente
 * llega a cada rutina desde el plan que le asigna su entrenador. */
export function useRoutine(id: string) {
  return useQuery({
    queryKey: ["routine", id],
    queryFn: () => api<Routine>(`/routines/${id}`),
    enabled: !!id,
  });
}
