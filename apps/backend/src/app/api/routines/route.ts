import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { createRoutineSchema, paginationSchema, difficultySchema } from "@truerep/shared";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const { limit, offset } = paginationSchema.parse(Object.fromEntries(url.searchParams));
  const difficultyParam = url.searchParams.get("difficulty")?.toUpperCase();
  const difficulty = difficultyParam ? difficultySchema.safeParse(difficultyParam) : null;
  if (difficulty && !difficulty.success) return fail("Invalid difficulty", 400);

  const routines = await db.routine.findMany({
    where: {
      is_published: true,
      deleted_at: null,
      ...(difficulty?.success ? { difficulty: difficulty.data } : {}),
    },
    include: { trainer: { select: { id: true, username: true, avatar_url: true } } },
    orderBy: { created_at: "desc" },
    take: limit,
    skip: offset,
  });
  return ok(routines);
});

export const POST = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const input = await parseBody(req, createRoutineSchema);
  const routine = await db.routine.create({
    data: { ...input, trainer_id: trainer.id },
  });
  return ok(routine, 201);
});
