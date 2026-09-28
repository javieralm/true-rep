import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";

/** Cola de videos esperando aprobación manual antes del análisis de IA
 * (gate del CEO review, 2026-07-31). Cualquier trainer puede revisar
 * cualquier video — alcance de un solo trainer, ver TODOS.md. */
export const GET = handler(async () => {
  await requireTrainer();
  const pending = await db.videoFeedback.findMany({
    where: { analysis_status: "PENDING_TRAINER_REVIEW" },
    include: { user: { select: { id: true, username: true, avatar_url: true } } },
    orderBy: { created_at: "asc" },
  });
  return ok(pending);
});
