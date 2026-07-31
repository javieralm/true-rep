import { Linking } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Checkout y Billing Portal abren el navegador del sistema (Stripe hosted pages).
 * Al volver a la app, React Query refresca "me" para reflejar el nuevo plan.
 */
export function useSubscription() {
  const queryClient = useQueryClient();

  const startCheckout = useMutation({
    mutationFn: async (plan: "base" | "premium") => {
      const { checkout_url } = await api<{ checkout_url: string }>("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      await Linking.openURL(checkout_url);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const { portal_url } = await api<{ portal_url: string }>("/subscriptions/portal", {
        method: "POST",
      });
      await Linking.openURL(portal_url);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return { startCheckout, openPortal };
}
