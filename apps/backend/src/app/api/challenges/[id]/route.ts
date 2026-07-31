import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const challenge = await db.challenge.findUnique({
    where: { id },
    include: {
      routine: { select: { id: true, title: true, difficulty: true, duration_minutes: true } },
      _count: { select: { participants: true } },
    },
  });
  if (!challenge) return fail("Challenge not found", 404);
  const { _count, ...c } = challenge;
  return ok({ ...c, participant_count: _count.participants });
});
