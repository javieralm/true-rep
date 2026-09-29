/** Tramos de comisión de TrueRep según los clientes activos del entrenador.
 * max = hasta cuántos clientes aplica (null = sin límite). */
export type CommissionTier = { max: number | null; pct: number };

// ponytail: constante hasta la fase C, que la mueve a PlatformSettings (editable desde /admin).
export const DEFAULT_TIERS: CommissionTier[] = [
  { max: 10, pct: 10 },
  { max: 30, pct: 8 },
  { max: null, pct: 6 },
];

/** Porcentaje que se lleva TrueRep de cada pago con Stripe. Manda el
 * porcentaje propio del entrenador si el superadmin le ha puesto uno. */
export function currentCommission(
  activeClients: number,
  override: number | null,
  tiers: CommissionTier[] = DEFAULT_TIERS
): number {
  if (override != null) return override;
  const tier = tiers.find((t) => t.max == null || activeClients <= t.max);
  return tier?.pct ?? tiers[tiers.length - 1].pct;
}
