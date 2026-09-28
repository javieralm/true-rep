import { Webhook } from "svix";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireEnv } from "@/lib/env";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    username?: string | null;
    first_name?: string | null;
    image_url?: string | null;
  };
};

/** Sincroniza usuarios de Clerk a la tabla users (webhook firmado con svix) */
export const POST = handler(async (req: Request) => {
  const body = await req.text();
  // Mismo criterio que el webhook de Stripe: si falta el secreto es un error de
  // configuración con su nombre, no un 500 genérico ni una "firma inválida"
  // que manda a depurar el sitio equivocado.
  const wh = new Webhook(requireEnv("CLERK_WEBHOOK_SECRET"));
  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as ClerkUserEvent;
  } catch {
    return fail("Invalid webhook signature", 400);
  }

  const { data } = event;
  const email = data.email_addresses?.[0]?.email_address;

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      if (!email) break;
      await db.user.upsert({
        where: { clerk_id: data.id },
        update: { email, avatar_url: data.image_url ?? undefined },
        create: {
          clerk_id: data.id,
          email,
          username: data.username ?? data.first_name ?? email.split("@")[0],
          avatar_url: data.image_url,
        },
      });
      break;
    }
    case "user.deleted": {
      const target = await db.user.findUnique({
        where: { clerk_id: data.id },
        select: { id: true, _count: { select: { workouts: true, video_feedback: true, routines: true } } },
      });
      if (!target) break; // already deleted or never synced

      // Un trainer con rutinas no se borra: la FK routines.trainer_id es
      // Restrict, así que borrarlo fallaría de todos modos — y aunque no
      // fallara, borrarlo arrastraría en cascada el historial de workouts de
      // sus suscriptores. Se anonimiza en su lugar (cumple "elimina mi cuenta"
      // sin destruir el historial de terceros).
      if (target._count.routines > 0) {
        console.warn(
          `user.deleted: anonymizing trainer ${target.id} (clerk: ${data.id}) instead of deleting — ` +
            `${target._count.routines} routines depend on it`
        );
        await db.user.update({
          where: { id: target.id },
          data: {
            clerk_id: `deleted-${target.id}`,
            email: `deleted-${target.id}@deleted.truerep.invalid`,
            username: "deleted-trainer",
            avatar_url: null,
          },
        });
        break;
      }

      console.warn(
        `user.deleted: removing user ${target.id} (clerk: ${data.id}) — ` +
          `${target._count.workouts} workouts, ${target._count.video_feedback} feedback records will cascade-delete`
      );
      await db.user.deleteMany({ where: { clerk_id: data.id } });
      break;
    }
  }

  return ok({ received: true });
});
