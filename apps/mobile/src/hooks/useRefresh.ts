import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Pull-to-refresh: reconsulta lo que la pantalla tenga activo en ese momento.
 *
 * Por pantalla y no por query porque varias muestran tres o cuatro a la vez (el
 * dashboard: usuario, rutinas y plan de hoy) y el usuario que tira hacia abajo
 * quiere que se actualice lo que está viendo, no una de las partes.
 *
 * El flag es local en vez de derivarse de isFetching para que el indicador solo
 * salga cuando lo ha pedido el usuario, no en cada refetch de fondo. */
export function useRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshing, onRefresh };
}
