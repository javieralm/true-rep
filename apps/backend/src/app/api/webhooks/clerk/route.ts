import { Webhook } from "svix";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";

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
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET ?? "");
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
    case "user.deleted":
      await db.user.deleteMany({ where: { clerk_id: data.id } });
      break;
  }

  return ok({ received: true });
});
