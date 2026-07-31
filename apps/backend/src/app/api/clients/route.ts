import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { programPosition } from "@/lib/programs";

/** Clientes del trainer = usuarios con programa suyo asignado y activo */
export const GET = handler(async () => {
  const trainer = await requireTrainer();
  const assignments = await db.programAssignment.findMany({
    where: { is_active: true, program: { trainer_id: trainer.id, deleted_at: null } },
    include: {
      user: { select: { id: true, username: true, email: true, avatar_url: true, streak: true } },
      program: {
        select: { id: true, name: true, _count: { select: { items: { where: { type: "ROUTINE" } } } } },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const now = new Date();
  const clients = await Promise.all(
    assignments.map(async (a) => {
      const workouts = await db.workout.count({
        where: { user_id: a.user_id, completed_at: { gte: a.start_date } },
      });
      const totalItems = a.program._count.items;
      return {
        assignment_id: a.id,
        user: a.user,
        program: { id: a.program.id, name: a.program.name },
        start_date: a.start_date,
        current_week: programPosition(a.start_date, now).week,
        completed_workouts: workouts,
        total_items: totalItems,
        completion_percent: totalItems ? Math.min(100, Math.round((workouts / totalItems) * 100)) : 0,
      };
    })
  );
  return ok(clients);
});
