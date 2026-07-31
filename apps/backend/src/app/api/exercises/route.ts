import { db } from "@/lib/db";
import { ok, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { createExerciseSchema } from "@truerep/shared";

export const GET = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const search = new URL(req.url).searchParams.get("search");
  const exercises = await db.exercise.findMany({
    where: {
      trainer_id: trainer.id,
      deleted_at: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return ok(exercises);
});

export const POST = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const input = await parseBody(req, createExerciseSchema);
  const exercise = await db.exercise.create({
    data: { ...input, trainer_id: trainer.id },
  });
  return ok(exercise, 201);
});
