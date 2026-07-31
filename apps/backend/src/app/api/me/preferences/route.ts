import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { preferencesSchema } from "@truerep/shared";

/** Preferencias de recordatorios (hora local, timezone, on/off) */
export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, preferencesSchema);
  const updated = await db.user.update({
    where: { id: user.id },
    data: input,
    select: { reminder_enabled: true, reminder_hour: true, timezone: true },
  });
  return ok(updated);
});
