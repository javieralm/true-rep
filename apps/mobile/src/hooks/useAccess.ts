import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MyAccess } from "@truerep/shared";

/** ¿Puede este usuario usar la app? Solo entra quien ha invitado un entrenador,
 * con el acceso activo y pagado. La primera llamada acepta la invitación
 * pendiente de su email. */
export function useAccess(enabled = true) {
  return useQuery({
    queryKey: ["access"],
    queryFn: () => api<MyAccess>("/me/access"),
    enabled,
  });
}
