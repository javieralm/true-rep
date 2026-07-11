import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import type { User } from "@prisma/client";

/** Regla no negociable #4: usuario autenticado o 401 */
export async function requireUser(): Promise<User> {
  const { userId } = await auth();
  if (!userId) throw fail("Unauthorized", 401);
  const user = await db.user.findUnique({ where: { clerk_id: userId } });
  if (!user) throw fail("User not found", 401);
  return user;
}

export async function requireTrainer(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "TRAINER") throw fail("Trainer role required", 403);
  return user;
}

/** Usuario autenticado si hay token, null si es anónimo (rutas públicas) */
export async function optionalUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({ where: { clerk_id: userId } });
}
