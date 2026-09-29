import type { Prisma, PrismaClient, TrainerClient, User } from "@prisma/client";
import type { AccessState } from "@truerep/shared";

type Db = PrismaClient | Prisma.TransactionClient;

/** Estados en los que el cliente "pertenece" a un entrenador. ENDED libera al
 * cliente para que otro entrenador pueda invitarle. */
export const LIVE_STATUSES = ["INVITED", "ACTIVE", "PAUSED"] as const;

/** Si un cliente puede entrenar. Pura, para poder probarla sin base de datos.
 *
 * - Efectivo: manda el entrenador. Activo y, si puso "pagado hasta", sin pasarse.
 *   El día de paid_until entero cuenta: se compara con el final de ese día.
 * - Stripe: la suscripción del cliente a su entrenador (Stripe Connect), en un
 *   estado que da acceso y sin pasarse del periodo pagado. past_due sigue
 *   dentro: Stripe está reintentando el cobro y cortará (unpaid/canceled) si no
 *   lo consigue. Quien aún no tiene suscripción con el entrenador pero venía
 *   de un plan antiguo de TrueRep conserva el acceso mientras le dure ese plan. */
export function evaluateAccess(
  relation: Pick<
    TrainerClient,
    "status" | "billing" | "paid_until" | "stripe_subscription_id" | "subscription_status" | "current_period_end"
  > | null,
  user: Pick<User, "subscription_status" | "subscription_expires_at">,
  now: Date
): AccessState {
  if (!relation || relation.status === "INVITED") return "no_invitation";
  if (relation.status === "ENDED") return "ended";
  if (relation.status === "PAUSED") return "paused";

  if (relation.billing === "CASH") {
    if (!relation.paid_until) return "active";
    const endOfDay = new Date(relation.paid_until);
    endOfDay.setUTCHours(23, 59, 59, 999);
    return endOfDay >= now ? "active" : "payment_required";
  }

  if (relation.stripe_subscription_id) {
    const paid =
      ACCESS_SUBSCRIPTION_STATUSES.has(relation.subscription_status ?? "") &&
      (!relation.current_period_end || relation.current_period_end >= now);
    return paid ? "active" : "payment_required";
  }

  const legacyPaid =
    user.subscription_status === "ACTIVE" &&
    (!user.subscription_expires_at || user.subscription_expires_at >= now);
  return legacyPaid ? "active" : "payment_required";
}

/** Estados de una suscripción de Stripe que dan acceso. */
export const ACCESS_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

/** La relación del cliente con su entrenador. Si no tiene ninguna pero hay una
 * invitación pendiente para su email, la acepta aquí: entrar en la app con el
 * email invitado es aceptar la invitación. El email viene de Clerk, que ya lo
 * ha verificado (código por email o Google). */
export async function clientRelation(db: Db, user: Pick<User, "id" | "email">) {
  const linked = await db.trainerClient.findFirst({
    where: { client_id: user.id, status: { not: "ENDED" } },
    include: { trainer: { select: { username: true, avatar_url: true } } },
    orderBy: { updated_at: "desc" },
  });
  if (linked) return linked;

  const invite = await db.trainerClient.findFirst({
    where: { email: user.email.toLowerCase(), status: "INVITED", client_id: null },
    orderBy: { invited_at: "desc" },
  });
  if (!invite) return null;

  return db.trainerClient.update({
    where: { id: invite.id },
    data: { client_id: user.id, status: "ACTIVE", accepted_at: new Date() },
    include: { trainer: { select: { username: true, avatar_url: true } } },
  });
}

/** La relación viva del cliente con su entrenador, con lo que hace falta para
 * cobrarle por Stripe en la cuenta del entrenador. */
export function stripeRelation(db: Db, clientId: string) {
  return db.trainerClient.findFirst({
    where: { client_id: clientId, status: { in: ["ACTIVE", "PAUSED"] } },
    include: {
      trainer: {
        select: {
          id: true,
          stripe_account_id: true,
          stripe_charges_enabled: true,
          commission_percent_override: true,
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });
}
