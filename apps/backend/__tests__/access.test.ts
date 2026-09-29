import { describe, it, expect } from "vitest";
import { evaluateAccess } from "@/lib/access";

const NOW = new Date("2026-09-29T12:00:00Z");
const noConnect = { stripe_subscription_id: null, subscription_status: null, current_period_end: null };
const cash = (paid_until: Date | null) => ({ status: "ACTIVE" as const, billing: "CASH" as const, paid_until, ...noConnect });
const stripeSub = (subscription_status: string, current_period_end: Date | null = new Date("2026-10-29")) => ({
  status: "ACTIVE" as const,
  billing: "STRIPE" as const,
  paid_until: null,
  stripe_subscription_id: "sub_1",
  subscription_status,
  current_period_end,
});

describe("evaluateAccess", () => {
  it("sin relación, o solo invitado, no hay acceso", () => {
    expect(evaluateAccess(null, NOW)).toBe("no_invitation");
    expect(evaluateAccess({ ...cash(null), status: "INVITED" }, NOW)).toBe("no_invitation");
  });

  it("pausado o finalizado por el entrenador corta el acceso aunque haya pagado", () => {
    expect(evaluateAccess({ ...stripeSub("active"), status: "PAUSED" }, NOW)).toBe("paused");
    expect(evaluateAccess({ ...cash(null), status: "ENDED" }, NOW)).toBe("ended");
  });

  it("efectivo sin fecha: manda el interruptor del entrenador", () => {
    expect(evaluateAccess(cash(null), NOW)).toBe("active");
  });

  it("efectivo: el día de 'pagado hasta' cuenta entero; el siguiente ya no", () => {
    expect(evaluateAccess(cash(new Date("2026-09-29T00:00:00Z")), NOW)).toBe("active");
    expect(evaluateAccess(cash(new Date("2026-09-28T00:00:00Z")), NOW)).toBe("payment_required");
  });

  it("Stripe sin suscripción todavía: pago pendiente", () => {
    expect(evaluateAccess({ ...cash(null), billing: "STRIPE" }, NOW)).toBe("payment_required");
  });

  it("Stripe: manda el estado de la suscripción al entrenador", () => {
    expect(evaluateAccess(stripeSub("active"), NOW)).toBe("active");
    expect(evaluateAccess(stripeSub("trialing"), NOW)).toBe("active");
    // Pago fallido: Stripe reintenta y el cliente sigue entrenando…
    expect(evaluateAccess(stripeSub("past_due"), NOW)).toBe("active");
    // …hasta que Stripe se rinde o se cancela.
    expect(evaluateAccess(stripeSub("unpaid"), NOW)).toBe("payment_required");
    expect(evaluateAccess(stripeSub("canceled"), NOW)).toBe("payment_required");
    expect(evaluateAccess(stripeSub("incomplete"), NOW)).toBe("payment_required");
    expect(evaluateAccess(stripeSub("active", new Date("2026-09-28")), NOW)).toBe("payment_required");
  });
});
