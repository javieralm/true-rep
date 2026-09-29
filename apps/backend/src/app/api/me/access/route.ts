import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { clientRelation, evaluateAccess } from "@/lib/access";
import type { MyAccess } from "@truerep/shared";

/** ¿Puede este usuario usar la app? La app lo pregunta al arrancar para
 * enseñar la pantalla correcta (sin invitación, pausado, pendiente de pago)
 * en vez de dejar que cada pantalla choque con un 402/403. Acepta de paso la
 * invitación pendiente para su email. */
export const GET = handler(async () => {
  const user = await requireUser();

  if (user.role === "TRAINER" || user.is_superadmin) {
    const res: MyAccess = { state: "active", is_trainer: true, trainer: null, billing: null, paid_until: null };
    return ok(res);
  }

  const relation = await clientRelation(db, user);
  const res: MyAccess = {
    state: evaluateAccess(relation, new Date()),
    is_trainer: false,
    trainer: relation && relation.status !== "INVITED" ? relation.trainer : null,
    billing: relation?.billing ?? null,
    paid_until: relation?.paid_until?.toISOString() ?? null,
  };
  return ok(res);
});
