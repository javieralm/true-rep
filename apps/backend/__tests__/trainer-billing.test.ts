import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, stripeApi } = vi.hoisted(() => ({
  db: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    trainerClient: { count: vi.fn(), findMany: vi.fn(async () => []) },
    platformSettings: { update: vi.fn() },
  },
  stripeApi: {
    subscriptions: {
      update: vi.fn(),
      create: vi.fn(async () => ({ id: "sub_fee_new" })),
      retrieve: vi.fn(),
      cancel: vi.fn(),
    },
    prices: { retrieve: vi.fn(), create: vi.fn() },
    v2: {
      core: {
        accounts: {
          create: vi.fn(async () => ({ id: "acct_new" })),
          update: vi.fn(),
        },
      },
    },
  },
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/stripe", () => ({ stripe: () => stripeApi }));

vi.mock("@/lib/platform", () => ({
  platformSettings: vi.fn(async () => ({
    commission_tiers: [
      { max: 10, pct: 10 },
      { max: 30, pct: 8 },
      { max: null, pct: 6 },
    ],
    cash_fee_amount: 200,
    cash_fee_currency: "eur",
    cash_fee_stripe_price_id: "price_fee",
  })),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));

import { syncTrainerBilling } from "@/lib/trainer-billing";

const trainer = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  email: "t@x.com",
  username: "Marta",
  stripe_account_id: "acct_t1",
  commission_percent_override: null,
  commission_percent_applied: 10,
  cash_fee_subscription_id: null,
  ...over,
});

/** count() se llama dos veces: clientes activos y clientes en efectivo activos. */
function clients(active: number, cash: number) {
  db.trainerClient.count
    .mockResolvedValueOnce(active)
    .mockResolvedValueOnce(cash);
}

describe("syncTrainerBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeApi.prices.retrieve.mockResolvedValue({
      id: "price_fee",
      active: true,
      unit_amount: 200,
      currency: "eur",
    });
  });

  it("al pasar de tramo actualiza la comisión solo de las suscripciones vivas y la guarda", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(trainer());
    clients(11, 0);
    db.trainerClient.findMany.mockResolvedValue([
      { stripe_subscription_id: "sub_a", subscription_status: "active" },
      { stripe_subscription_id: "sub_b", subscription_status: "canceled" },
    ] as never);

    await syncTrainerBilling("t1");

    expect(stripeApi.subscriptions.update).toHaveBeenCalledTimes(1);
    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith(
      "sub_a",
      { application_fee_percent: 8 },
      { stripeAccount: "acct_t1" },
    );
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { commission_percent_applied: 8 },
    });
  });

  it("sin cambios de tramo ni clientes en efectivo no llama a Stripe", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(trainer());
    clients(5, 0);

    await syncTrainerBilling("t1");

    expect(stripeApi.subscriptions.update).not.toHaveBeenCalled();
    expect(stripeApi.subscriptions.create).not.toHaveBeenCalled();
  });

  it("el porcentaje propio manda sobre el tramo", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(
      trainer({ commission_percent_override: 4 }),
    );
    clients(3, 0);
    db.trainerClient.findMany.mockResolvedValue([
      { stripe_subscription_id: "sub_a", subscription_status: "past_due" },
    ] as never);

    await syncTrainerBilling("t1");

    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith(
      "sub_a",
      { application_fee_percent: 4 },
      expect.anything(),
    );
  });

  it("primer cliente en efectivo de un entrenador sin Stripe: cuenta solo para pagar y cuota por factura", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(
      trainer({ stripe_account_id: null, commission_percent_applied: null }),
    );
    clients(1, 1);

    await syncTrainerBilling("t1");

    expect(stripeApi.v2.core.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ configuration: { customer: {} } }),
    );
    expect(stripeApi.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_account: "acct_new",
        items: [{ price: "price_fee", quantity: 1 }],
        collection_method: "send_invoice",
      }),
    );
    expect(db.user.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { cash_fee_subscription_id: "sub_fee_new" },
      }),
    );
  });

  it("cambia la cantidad de la cuota sin prorratear cuando cambian los clientes en efectivo", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(
      trainer({ cash_fee_subscription_id: "sub_fee" }),
    );
    clients(4, 3);
    stripeApi.subscriptions.retrieve.mockResolvedValue({
      id: "sub_fee",
      status: "active",
      items: {
        data: [{ id: "si_1", quantity: 2, price: { id: "price_fee" } }],
      },
    });

    await syncTrainerBilling("t1");

    expect(stripeApi.subscriptions.update).toHaveBeenCalledWith("sub_fee", {
      items: [{ id: "si_1", price: "price_fee", quantity: 3 }],
      proration_behavior: "none",
    });
    expect(stripeApi.subscriptions.create).not.toHaveBeenCalled();
  });

  it("una cuota cancelada (impago) se vuelve a crear si sigue habiendo clientes en efectivo", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue(
      trainer({ cash_fee_subscription_id: "sub_fee" }),
    );
    clients(2, 2);
    stripeApi.subscriptions.retrieve.mockResolvedValue({
      id: "sub_fee",
      status: "canceled",
      items: { data: [] },
    });

    await syncTrainerBilling("t1");

    expect(stripeApi.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_account: "acct_t1",
        items: [{ price: "price_fee", quantity: 2 }],
      }),
    );
  });
});
