import * as WebBrowser from "expo-web-browser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Checkout y Billing Portal son páginas alojadas por Stripe.
 *
 * Se abren con openBrowserAsync (navegador dentro de la app) y no con
 * Linking.openURL: openURL manda al usuario a Safari/Chrome y resuelve en
 * cuanto el navegador se abre, así que "me" se refrescaba antes de que nadie
 * hubiera pagado nada. El usuario volvía y seguía viendo "Sin plan".
 *
 * openBrowserAsync resuelve cuando el usuario cierra el navegador y vuelve a la
 * app, que es el momento en el que tiene sentido releer el plan.
 *
 * No se usa openAuthSessionAsync, que sería lo natural para un flujo OAuth,
 * porque espera un redirect al esquema de la app y el success_url de Stripe
 * apunta a una URL web del backend (`/checkout/success`): nunca se dispararía.
 *
 * El plan lo activa el webhook de Stripe, que puede llegar un instante después
 * de que el usuario cierre el navegador. Si no está listo todavía, el refresco
 * por AppState del layout raíz lo recoge la próxima vez que la app vuelve a
 * primer plano.
 */
export function useSubscription() {
  const queryClient = useQueryClient();

  const startCheckout = useMutation({
    mutationFn: async (plan: "base" | "premium") => {
      const { checkout_url } = await api<{ checkout_url: string }>("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      await WebBrowser.openBrowserAsync(checkout_url);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const { portal_url } = await api<{ portal_url: string }>("/subscriptions/portal", {
        method: "POST",
      });
      await WebBrowser.openBrowserAsync(portal_url);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return { startCheckout, openPortal };
}
