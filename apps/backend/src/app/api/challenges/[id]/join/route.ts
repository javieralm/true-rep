import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireActiveSubscription } from "@/lib/auth";

export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  // Tier Base: la comunidad/retos requiere suscripción activa
  const user = await requireActiveSubscription();

  const challenge = await db.challenge.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
  if (!challenge) return fail("Challenge not found", 404);

  const now = new Date();
  if (now < challenge.starts_at) return fail("Challenge has not started yet", 400);
  if (now > challenge.ends_at) return fail("Challenge has ended", 400);
  if (challenge.max_participants && challenge._count.participants >= challenge.max_participants)
    return fail("Challenge is full", 400);

  const existing = await db.challengeParticipant.findUnique({
    where: { challenge_id_user_id: { challenge_id: id, user_id: user.id } },
  });
  if (existing) return fail("Already joined", 409);

  const participant = await db.challengeParticipant.create({
    data: { challenge_id: id, user_id: user.id },
  });
  return ok(participant, 201);
});
