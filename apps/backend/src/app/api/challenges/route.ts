import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { createChallengeSchema, paginationSchema } from "@truerep/shared";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const { limit, offset } = paginationSchema.parse(Object.fromEntries(url.searchParams));

  const challenges = await db.challenge.findMany({
    where: { ends_at: { gte: new Date() } }, // activos + próximos
    include: {
      routine: { select: { id: true, title: true, difficulty: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { starts_at: "asc" },
    take: limit,
    skip: offset,
  });
  return ok(
    challenges.map(({ _count, ...c }) => ({ ...c, participant_count: _count.participants }))
  );
});

export const POST = handler(async (req: Request) => {
  await requireTrainer();
  const input = await parseBody(req, createChallengeSchema);
  const challenge = await db.challenge.create({
    data: {
      ...input,
      starts_at: new Date(input.starts_at),
      ends_at: new Date(input.ends_at),
    },
  });
  return ok(challenge, 201);
});
