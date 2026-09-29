import { describe, it, expect } from "vitest";
import { evaluateAccess } from "@/lib/access";

const NOW = new Date("2026-09-29T12:00:00Z");
const noSub = { subscription_status: "FREE" as const, subscription_expires_at: null };
const activeSub = { subscription_status: "ACTIVE" as const, subscription_expires_at: null };
const noConnect = { stripe_subscription_id: null, subscription_status: null, current_period_end: null };
const cash = (paid_until: Date | null) => ({ status: "ACTIVE" as const, billing: "CASH" as const, paid_until, ...noConnect });

describe("evaluateAccess", () => {
  it("sin relación, o solo invitado, no hay acceso", () => {
    expect(evaluateAccess(null, activeSub, NOW)).toBe("no_invitation");
    expect(evaluateAccess({ ...cash(null), status: "INVITED" }, activeSub, NOW)).toBe("no_invitation");
  });

  it("pausado o finalizado por el entrenador corta el acceso aunque haya pagado", () => {
    expect(evaluateAccess({ ...cash(null), status: "PAUSED" }, activeSub, NOW)).toBe("paused");
    expect(evaluateAccess({ ...cash(null), status: "ENDED" }, activeSub, NOW)).toBe("ended");
  });

  it("efectivo sin fecha: manda el interruptor del entrenador", () => {
    expect(evaluateAccess(cash(null), noSub, NOW)).toBe("active");
  });

  it("efectivo: el día de 'pagado hasta' cuenta entero; el siguiente ya no", () => {
    expect(evaluateAccess(cash(new Date("2026-09-29T00:00:00Z")), noSub, NOW)).toBe("active");
    expect(evaluateAccess(cash(new Date("2026-09-28T00:00:00Z")), noSub, NOW)).toBe("payment_required");
  });

  it("Stripe sin suscripción con el entrenador: vale el plan antiguo mientras dure", () => {
    const stripe = { status: "ACTIVE" as const, billing: "STRIPE" as const, paid_until: null, ...noConnect };
    expect(evaluateAccess(stripe, activeSub, NOW)).toBe("active");
    expect(evaluateAccess(stripe, noSub, NOW)).toBe("payment_required");
    expect(
      evaluateAccess(stripe, { subscription_status: "ACTIVE", subscription_expires_at: new Date("2026-09-01") }, NOW)
    ).toBe("payment_required");
  });

  it("Stripe Connect: manda la suscripción al entrenador, no el plan antiguo", () => {
    const sub = (subscription_status: string, current_period_end: Date | null = new Date("2026-10-29")) => ({
      status: "ACTIVE" as const,
      billing: "STRIPE" as const,
      paid_until: null,
      stripe_subscription_id: "sub_1",
      subscription_status,
      current_period_end,
    });
    expect(evaluateAccess(sub("active"), noSub, NOW)).toBe("active");
    expect(evaluateAccess(sub("trialing"), noSub, NOW)).toBe("active");
    // Pago fallido: Stripe reintenta y el cliente sigue entrenando…
    expect(evaluateAccess(sub("past_due"), noSub, NOW)).toBe("active");
    // …hasta que Stripe se rinde o se cancela.
    expect(evaluateAccess(sub("unpaid"), activeSub, NOW)).toBe("payment_required");
    expect(evaluateAccess(sub("canceled"), activeSub, NOW)).toBe("payment_required");
    expect(evaluateAccess(sub("incomplete"), noSub, NOW)).toBe("payment_required");
    expect(evaluateAccess(sub("active", new Date("2026-09-28")), noSub, NOW)).toBe("payment_required");
  });
});
