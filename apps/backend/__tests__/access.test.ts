import { describe, it, expect } from "vitest";
import { evaluateAccess } from "@/lib/access";

const NOW = new Date("2026-09-29T12:00:00Z");
const noSub = { subscription_status: "FREE" as const, subscription_expires_at: null };
const activeSub = { subscription_status: "ACTIVE" as const, subscription_expires_at: null };
const cash = (paid_until: Date | null) => ({ status: "ACTIVE" as const, billing: "CASH" as const, paid_until });

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

  it("Stripe: depende de la suscripción, activa y sin vencer", () => {
    const stripe = { status: "ACTIVE" as const, billing: "STRIPE" as const, paid_until: null };
    expect(evaluateAccess(stripe, activeSub, NOW)).toBe("active");
    expect(evaluateAccess(stripe, noSub, NOW)).toBe("payment_required");
    expect(
      evaluateAccess(stripe, { subscription_status: "ACTIVE", subscription_expires_at: new Date("2026-09-01") }, NOW)
    ).toBe("payment_required");
  });
});
