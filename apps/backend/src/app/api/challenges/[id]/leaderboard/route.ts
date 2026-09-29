import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

/** Clasificación de un reto: solo con sesión (lista nombres de clientes). */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const challenge = await db.challenge.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!challenge) return fail("Challenge not found", 404);

  const participants = await db.challengeParticipant.findMany({
    where: { challenge_id: id },
    include: { user: { select: { id: true, username: true, avatar_url: true } } },
    // completados primero (más rápido = mejor rank), luego pendientes por fecha de unión
    orderBy: [{ completed_at: { sort: "asc", nulls: "last" } }, { joined_at: "asc" }],
  });

  let rank = 0;
  return ok({
    challenge_id: challenge.id,
    title: challenge.title,
    participants: participants.map((p) => ({
      rank: p.completed_at ? ++rank : null,
      user_id: p.user.id,
      username: p.user.username,
      avatar_url: p.user.avatar_url,
      joined_at: p.joined_at,
      completed_at: p.completed_at,
    })),
  });
});
