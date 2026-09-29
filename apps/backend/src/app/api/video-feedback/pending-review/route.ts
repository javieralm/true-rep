import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { clientOf } from "@/lib/access";

/** Cola de videos esperando aprobación manual antes del análisis de IA
 * (gate del CEO review, 2026-07-31). Cada entrenador ve solo los de sus
 * clientes: son vídeos de personas entrenando, no se comparten entre entrenadores. */
export const GET = handler(async () => {
  const trainer = await requireTrainer();
  const pending = await db.videoFeedback.findMany({
    where: { analysis_status: "PENDING_TRAINER_REVIEW", user: clientOf(trainer.id) },
    include: { user: { select: { id: true, username: true, avatar_url: true } } },
    orderBy: { created_at: "asc" },
  });
  return ok(pending);
});
