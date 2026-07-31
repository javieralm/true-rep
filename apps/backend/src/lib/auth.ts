import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import type { User } from "@prisma/client";

/**
 * Devuelve el user de Prisma para la sesión Clerk, creándolo al vuelo si falta.
 * El webhook de Clerk es la fuente de verdad, pero no llega a localhost en dev,
 * así que aquí lo sincronizamos perezosamente. null = sin sesión.
 */
export async function getOrSyncUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const existing = await db.user.findUnique({ where: { clerk_id: userId } });
  if (existing) return existing;

  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress;
  if (!cu || !email) return null;
  // upsert (no plain create): dos requests concurrentes del mismo usuario nuevo
  // pueden pasar ambas el `existing === null` de arriba; sin upsert, la segunda
  // create() fallaría por el unique constraint de clerk_id.
  return db.user.upsert({
    where: { clerk_id: userId },
    update: {},
    create: {
      clerk_id: userId,
      email,
      username: cu.username ?? cu.firstName ?? email.split("@")[0],
      avatar_url: cu.imageUrl,
    },
  });
}

/** Regla no negociable #4: usuario autenticado o 401 */
export async function requireUser(): Promise<User> {
  const user = await getOrSyncUser();
  if (!user) throw fail("Unauthorized", 401);
  return user;
}

export async function requireTrainer(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "TRAINER") throw fail("Trainer role required", 403);
  return user;
}

/** Backoffice de administración: solo superadmins pueden promover trainers */
export async function requireSuperadmin(): Promise<User> {
  const user = await requireUser();
  if (!user.is_superadmin) throw fail("Superadmin access required", 403);
  return user;
}

/** Gate de tier Base: cualquier suscripción activa (BASE o PREMIUM), y no vencida */
export async function requireActiveSubscription(): Promise<User> {
  const user = await requireUser();
  if (user.subscription_status !== "ACTIVE")
    throw fail("Active subscription required", 402);
  // El webhook de Stripe puede llegar con lag; una fila ACTIVE con
  // expires_at ya pasado no debe seguir dando acceso.
  if (user.subscription_expires_at && user.subscription_expires_at < new Date())
    throw fail("Subscription expired", 402);
  return user;
}

/** Gate de tier Premium: coaches, análisis de vídeo, stats avanzadas */
export async function requirePremium(): Promise<User> {
  const user = await requireActiveSubscription();
  if (user.subscription_plan !== "PREMIUM")
    throw fail("Premium plan required", 402);
  return user;
}

/** Usuario autenticado si hay token, null si es anónimo (rutas públicas) */
export async function optionalUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({ where: { clerk_id: userId } });
}
