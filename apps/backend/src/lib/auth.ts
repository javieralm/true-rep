import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { clientRelation, evaluateAccess } from "@/lib/access";
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
  if (!cu) return null;
  // Preferir el email primario/verificado de Clerk; el primero de la lista
  // no siempre lo es (ej. tras vincular un segundo email).
  const primary = cu.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId);
  const email = primary?.emailAddress ?? cu.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;
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

/** Puerta de todo lo que hace un cliente (entrenar, su plan, sus stats): tiene
 * que ser cliente de un entrenador, con la relación activa y pagada. Sustituye
 * a los antiguos niveles Base/Premium: ahora no hay planes de TrueRep, hay
 * clientes de entrenadores. Los entrenadores pasan siempre (prueban sus rutinas).
 *
 * 402 si falta el pago; 403 si no hay invitación o el entrenador le ha pausado. */
export async function requireClientAccess(): Promise<User> {
  const user = await requireUser();
  if (user.role === "TRAINER" || user.is_superadmin) return user;
  const relation = await clientRelation(db, user);
  const state = evaluateAccess(relation, user, new Date());
  if (state === "payment_required") throw fail("Payment required", 402);
  if (state !== "active") throw fail("Client access required", 403);
  return user;
}

/** Usuario autenticado si hay token, null si es anónimo (rutas públicas).
 * Usa el mismo lazy-sync que requireUser() — de lo contrario, una sesión
 * válida cuyo webhook de Clerk aún no llegó vería un anónimo por error. */
export async function optionalUser(): Promise<User | null> {
  return getOrSyncUser();
}
