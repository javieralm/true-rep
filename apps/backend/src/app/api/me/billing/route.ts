import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { stripeRelation } from "@/lib/access";
import { trainerCanCharge } from "@/lib/stripe";
import type { MyBilling } from "@truerep/shared";

/** Lo que necesita la app para que el cliente pague a su entrenador: los
 * precios que ofrece y cómo va su suscripción. */
export const GET = handler(async () => {
  const user = await requireUser();
  const relation = await stripeRelation(db, user.id);
  if (!relation || relation.billing !== "STRIPE") return fail("No pagas por Stripe a tu entrenador", 404);

  let canCharge = false;
  try {
    canCharge = await trainerCanCharge(relation.trainer);
  } catch (e) {
    console.error("Stripe account status error:", e);
  }
  const prices = canCharge
    ? await db.trainerPrice.findMany({
        where: { trainer_id: relation.trainer_id, active: true },
        select: { interval: true, amount: true, currency: true },
      })
    : [];

  const res: MyBilling = {
    can_subscribe: canCharge && prices.length > 0,
    prices,
    subscription: relation.subscription_status
      ? {
          status: relation.subscription_status,
          current_period_end: relation.current_period_end?.toISOString() ?? null,
        }
      : null,
  };
  return ok(res);
});
