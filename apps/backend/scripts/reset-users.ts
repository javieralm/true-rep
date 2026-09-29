/**
 * Reinicio de usuarios: deja la plataforma como recién estrenada, conservando
 * solo a los superadmins (su usuario, su cuenta de Clerk y su librería de
 * ejercicios) y los ajustes de TrueRep (comisión y cuota).
 *
 * Borra, en este orden:
 *  1. Stripe (solo modo de pruebas): cuotas de efectivo y cuentas conectadas de
 *     los usuarios que se borran; cuota y comisión aplicada de los superadmins.
 *  2. Clerk: invitaciones pendientes y todos los usuarios que no son superadmin.
 *  3. Base de datos: rutinas (bloquean el borrado de su entrenador), retos,
 *     relaciones y programas de todos, y después los usuarios no superadmin
 *     (el resto cae en cascada).
 *
 * Uso (desde apps/backend):
 *   npx tsx --env-file=.env --env-file=.env.local scripts/reset-users.ts            # solo cuenta
 *   npx tsx --env-file=.env --env-file=.env.local scripts/reset-users.ts --confirm  # borra
 */
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const confirm = process.argv.includes("--confirm");
const db = new PrismaClient();

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name}`);
  return v;
}

async function main() {
  const stripeKey = env("STRIPE_SECRET_KEY");
  // Nunca contra dinero real: las cuentas conectadas live no se tocan desde un script.
  if (!/^(sk|rk)_test_/.test(stripeKey)) throw new Error("STRIPE_SECRET_KEY no es de pruebas: abortado");
  const stripe = new Stripe(stripeKey);
  const clerk = createClerkClient({ secretKey: env("CLERK_SECRET_KEY") });

  const keep = await db.user.findMany({ where: { is_superadmin: true } });
  if (keep.length === 0) throw new Error("No hay ningún superadmin: abortado para no quedarte sin acceso a /admin");
  const keepIds = keep.map((u) => u.id);
  const keepClerk = new Set(keep.map((u) => u.clerk_id));
  const doomed = await db.user.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true, email: true, clerk_id: true, stripe_account_id: true, cash_fee_subscription_id: true },
  });

  const clerkUsers = [];
  for (let offset = 0; ; offset += 100) {
    const page = await clerk.users.getUserList({ limit: 100, offset });
    clerkUsers.push(...page.data);
    if (page.data.length < 100) break;
  }
  const clerkDoomed = clerkUsers.filter((u) => !keepClerk.has(u.id));
  const invitations = (await clerk.invitations.getInvitationList({ status: "pending" })).data;

  const counts = {
    usuarios: doomed.length,
    relaciones: await db.trainerClient.count(),
    programas: await db.program.count(),
    rutinas: await db.routine.count(),
    entrenos: await db.workout.count(),
    retos: await db.challenge.count(),
    ejercicios_de_otros: await db.exercise.count({ where: { trainer_id: { notIn: keepIds } } }),
  };

  console.log(`Se conservan (superadmin): ${keep.map((u) => u.email).join(", ")}`);
  console.log("Base de datos a borrar:", counts);
  console.log(`Clerk: ${clerkDoomed.length} usuarios de ${clerkUsers.length} y ${invitations.length} invitaciones pendientes`);
  console.log(`Stripe (pruebas): ${doomed.filter((u) => u.stripe_account_id).length} cuentas conectadas`);
  if (!confirm) {
    console.log("\nNo se ha borrado nada. Repite con --confirm para borrar.");
    return;
  }

  // 1. Stripe
  for (const u of [...doomed, ...keep]) {
    if (u.cash_fee_subscription_id) {
      await stripe.subscriptions.cancel(u.cash_fee_subscription_id).catch((e) => console.warn("cuota:", e.message));
    }
  }
  for (const u of doomed) {
    if (u.stripe_account_id) {
      await stripe.accounts.del(u.stripe_account_id).catch((e) => console.warn("cuenta:", u.stripe_account_id, e.message));
    }
  }

  // 2. Clerk
  for (const inv of invitations) await clerk.invitations.revokeInvitation(inv.id).catch(() => {});
  for (const u of clerkDoomed) await clerk.users.deleteUser(u.id);

  // 3. Base de datos
  await db.$transaction([
    db.routine.deleteMany({}), // Restrict sobre el entrenador; arrastra sus entrenos
    db.challenge.deleteMany({}),
    db.trainerClient.deleteMany({}),
    db.program.deleteMany({}),
    db.videoFeedback.deleteMany({}),
    db.workout.deleteMany({}),
    db.stripeEvent.deleteMany({}),
    db.user.deleteMany({ where: { id: { notIn: keepIds } } }),
    db.user.updateMany({
      where: { id: { in: keepIds } },
      data: { cash_fee_subscription_id: null, commission_percent_applied: null, xp: 0, streak: 0, streak_last_workout_date: null },
    }),
  ]);
  console.log("\nReinicio hecho.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
