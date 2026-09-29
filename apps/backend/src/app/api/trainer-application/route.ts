import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { trainerApplicationSchema } from "@truerep/shared";

/** Solicitud para ser entrenador. No da ningún permiso: el rol TRAINER solo lo
 * pone un superadmin desde /admin (regla 4). Repetirla actualiza la nota. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (user.role === "TRAINER") return fail("Ya eres entrenador", 409);
  const { note } = await parseBody(req, trainerApplicationSchema);
  await db.user.update({
    where: { id: user.id },
    data: { trainer_requested_at: user.trainer_requested_at ?? new Date(), trainer_application_note: note || null },
  });
  return ok({ requested: true }, 201);
});
