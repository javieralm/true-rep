import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { programPosition } from "@/lib/programs";
import { LIVE_STATUSES } from "@/lib/access";
import { inviteClientSchema, type TrainerClientRow } from "@truerep/shared";

/** Clientes del entrenador: invitados, activos y pausados, con el programa
 * que tengan asignado y cómo lo llevan. */
export const GET = handler(async () => {
  const trainer = await requireTrainer();
  const relations = await db.trainerClient.findMany({
    where: { trainer_id: trainer.id, status: { in: [...LIVE_STATUSES] } },
    include: {
      client: {
        select: {
          id: true,
          username: true,
          email: true,
          avatar_url: true,
          streak: true,
          program_assignments: {
            where: { is_active: true, program: { trainer_id: trainer.id, deleted_at: null } },
            include: {
              program: {
                select: { id: true, name: true, _count: { select: { items: { where: { type: "ROUTINE" } } } } },
              },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { invited_at: "desc" }],
  });

  const now = new Date();
  const rows: TrainerClientRow[] = await Promise.all(
    relations.map(async (r) => {
      const a = r.client?.program_assignments[0];
      let program: TrainerClientRow["program"] = null;
      if (a && r.client) {
        const done = await db.workout.count({
          where: { user_id: r.client.id, completed_at: { gte: a.start_date } },
        });
        const total = a.program._count.items;
        program = {
          id: a.program.id,
          name: a.program.name,
          current_week: programPosition(a.start_date, now).week,
          completed_workouts: done,
          total_items: total,
          completion_percent: total ? Math.min(100, Math.round((done / total) * 100)) : 0,
        };
      }
      return {
        id: r.id,
        email: r.email,
        status: r.status,
        billing: r.billing,
        paid_until: r.paid_until?.toISOString() ?? null,
        invited_at: r.invited_at.toISOString(),
        accepted_at: r.accepted_at?.toISOString() ?? null,
        user: r.client
          ? {
              id: r.client.id,
              username: r.client.username,
              email: r.client.email,
              avatar_url: r.client.avatar_url,
              streak: r.client.streak,
            }
          : null,
        program,
      };
    })
  );
  return ok(rows);
});

/** Invitar a un cliente por email. Un cliente solo puede tener un entrenador:
 * si el email ya pertenece a otro, se rechaza. Reinvitar a alguien propio que
 * había terminado lo vuelve a dejar como invitado. */
export const POST = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const { email, billing, paid_until } = await parseBody(req, inviteClientSchema);
  if (email === trainer.email.toLowerCase()) return fail("No puedes invitarte a ti mismo", 400);

  const taken = await db.trainerClient.findFirst({
    where: { email, status: { in: [...LIVE_STATUSES] }, NOT: { trainer_id: trainer.id } },
  });
  if (taken) return fail("Este email ya es cliente de otro entrenador", 409);

  const existing = await db.trainerClient.findUnique({
    where: { trainer_id_email: { trainer_id: trainer.id, email } },
  });
  if (existing && existing.status !== "ENDED") return fail("Ya has invitado a este email", 409);

  const data = { billing, paid_until: paid_until ? new Date(paid_until) : null };
  const relation = existing
    ? await db.trainerClient.update({
        where: { id: existing.id },
        data: { ...data, status: "INVITED", client_id: null, accepted_at: null, invited_at: new Date() },
      })
    : await db.trainerClient.create({ data: { ...data, trainer_id: trainer.id, email } });

  // El correo lo manda Clerk. Si falla, la invitación sigue valiendo: el
  // cliente queda vinculado en cuanto entre en la app con este email, así que
  // el entrenador puede avisarle por otra vía.
  let emailSent = true;
  try {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      notify: true,
      ignoreExisting: true,
      publicMetadata: { trainer_id: trainer.id },
      ...(process.env.NEXT_PUBLIC_APP_URL ? { redirectUrl: process.env.NEXT_PUBLIC_APP_URL } : {}),
    });
    await db.trainerClient.update({ where: { id: relation.id }, data: { clerk_invitation_id: invitation.id } });
  } catch (e) {
    console.error("Clerk invitation error:", e);
    emailSent = false;
  }

  return ok({ id: relation.id, email_sent: emailSent }, 201);
});
