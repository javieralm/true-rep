import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { pushTokenSchema } from "@truerep/shared";

/** Registra (o reactiva) el token Expo del dispositivo */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { token, platform } = await parseBody(req, pushTokenSchema);

  await db.pushToken.upsert({
    where: { token },
    create: { user_id: user.id, token, platform: platform ?? null, is_active: true },
    update: { user_id: user.id, is_active: true, ...(platform ? { platform } : {}) },
  });
  return ok({ registered: true }, 201);
});
