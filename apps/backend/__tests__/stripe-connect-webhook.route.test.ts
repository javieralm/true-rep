import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

const tx = {
  stripeEvent: { create: vi.fn() },
  trainerClient: { findFirst: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/db", () => ({
  db: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) },
}));

import { POST } from "@/app/api/webhooks/stripe-connect/route";

const SECRET = "whsec_test";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = SECRET;

function subEvent(status: string, opts: { id?: string; account?: string; sub?: string } = {}) {
  return {
    id: opts.id ?? "evt_1",
    object: "event",
    type: "customer.subscription.updated",
    account: opts.account ?? "acct_trainer",
    data: {
      object: {
        id: opts.sub ?? "sub_1",
        object: "subscription",
        status,
        customer: "cus_1",
        metadata: { trainer_client_id: "tc_1" },
        items: { data: [{ current_period_end: 1_790_000_000, price: { id: "price_1" } }] },
      },
    },
  };
}

function signed(payload: object, secret = SECRET) {
  const body = JSON.stringify(payload);
  const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("http://localhost/api/webhooks/stripe-connect", {
    method: "POST",
    headers: { "stripe-signature": header },
    body,
  });
}

const relation = (over: Record<string, unknown> = {}) => ({
  id: "tc_1",
  stripe_subscription_id: "sub_1",
  subscription_status: "active",
  trainer: { stripe_account_id: "acct_trainer" },
  ...over,
});

describe("POST /api/webhooks/stripe-connect", () => {
  beforeEach(() => {
    tx.stripeEvent.create.mockReset();
    tx.trainerClient.findFirst.mockReset();
    tx.trainerClient.update.mockReset();
  });

  it("firma inválida → 400 y no toca la base de datos", async () => {
    const res = await POST(signed(subEvent("active"), "whsec_otro"));
    expect(res.status).toBe(400);
    expect(tx.stripeEvent.create).not.toHaveBeenCalled();
  });

  it("pago fallido (past_due → unpaid) guarda el estado que corta el acceso", async () => {
    tx.trainerClient.findFirst.mockResolvedValue(relation({ subscription_status: "past_due" }));
    const res = await POST(signed(subEvent("unpaid")));
    expect(res.status).toBe(200);
    expect(tx.trainerClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tc_1" },
        data: expect.objectContaining({
          subscription_status: "unpaid",
          stripe_customer_id: "cus_1",
          price_id: "price_1",
          current_period_end: new Date(1_790_000_000 * 1000),
        }),
      })
    );
  });

  it("evento repetido → 200 sin reprocesar", async () => {
    tx.stripeEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" })
    );
    const res = await POST(signed(subEvent("active")));
    expect(res.status).toBe(200);
    expect((await res.json()).data.duplicate).toBe(true);
    expect(tx.trainerClient.update).not.toHaveBeenCalled();
  });

  it("ignora eventos de una cuenta que no es la del entrenador del cliente", async () => {
    tx.trainerClient.findFirst.mockResolvedValue(relation());
    await POST(signed(subEvent("active", { account: "acct_otro" })));
    expect(tx.trainerClient.update).not.toHaveBeenCalled();
  });

  it("un evento viejo no resucita una suscripción cancelada", async () => {
    tx.trainerClient.findFirst.mockResolvedValue(relation({ subscription_status: "canceled" }));
    await POST(signed(subEvent("active")));
    expect(tx.trainerClient.update).not.toHaveBeenCalled();
  });

  it("la cancelación de una suscripción anterior no pisa la nueva activa", async () => {
    tx.trainerClient.findFirst.mockResolvedValue(relation({ stripe_subscription_id: "sub_nueva" }));
    await POST(signed(subEvent("canceled", { sub: "sub_vieja" })));
    expect(tx.trainerClient.update).not.toHaveBeenCalled();
  });
});
