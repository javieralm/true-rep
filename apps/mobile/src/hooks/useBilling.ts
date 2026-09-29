import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MyBilling, PriceInterval } from "@truerep/shared";

/**
 * Pago del cliente a su entrenador por Stripe. Checkout y portal son páginas de
 * Stripe que se abren en el navegador, no dentro de la app (excepción 3.1.3(d)
 * de Apple para servicios de persona a persona).
 *
 * openBrowserAsync y no Linking.openURL: openURL resuelve en cuanto se abre el
 * navegador y el acceso se releía antes de pagar. openBrowserAsync resuelve al
 * cerrar el navegador, que es cuando tiene sentido releerlo. El acceso lo activa
 * el webhook, que puede tardar un instante: "Volver a comprobar" lo recoge.
 */
export function useBilling(enabled: boolean) {
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["access"] }),
    qc.invalidateQueries({ queryKey: ["billing"] }),
  ]);

  const billing = useQuery({
    queryKey: ["billing"],
    queryFn: () => api<MyBilling>("/me/billing"),
    enabled,
  });

  const checkout = useMutation({
    mutationFn: async (interval: PriceInterval) => {
      const { checkout_url } = await api<{ checkout_url: string }>("/me/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ interval }),
      });
      await WebBrowser.openBrowserAsync(checkout_url);
    },
    onSettled: refresh,
  });

  const portal = useMutation({
    mutationFn: async () => {
      const { portal_url } = await api<{ portal_url: string }>("/me/billing/portal", { method: "POST" });
      await WebBrowser.openBrowserAsync(portal_url);
    },
    onSettled: refresh,
  });

  return { billing, checkout, portal };
}

const INTERVAL_LABEL: Record<PriceInterval, string> = { MONTH: "al mes", QUARTER: "cada 3 meses", YEAR: "al año" };

/** "45,00 € al mes" */
export function priceLabel(p: { interval: PriceInterval; amount: number; currency: string }) {
  const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: p.currency.toUpperCase() }).format(
    p.amount / 100
  );
  return `${money} ${INTERVAL_LABEL[p.interval]}`;
}
