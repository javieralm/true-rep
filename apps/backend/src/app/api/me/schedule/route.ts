import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requireClientAccess } from "@/lib/auth";
import { programPosition } from "@/lib/programs";

/** Lo que el entrenador ha puesto para hoy en el programa asignado */
export const GET = handler(async () => {
  const user = await requireClientAccess();

  const assignment = await db.programAssignment.findFirst({
    where: { user_id: user.id, is_active: true, program: { deleted_at: null } },
    include: { program: { select: { id: true, name: true } } },
    orderBy: { created_at: "desc" },
  });
  if (!assignment) return ok(null); // sin programa asignado — no es un error

  const now = new Date();
  const { week, day } = programPosition(assignment.start_date, now);
  if (week === 0) return ok(null); // el programa aún no ha empezado

  const items = await db.programItem.findMany({
    where: { program_id: assignment.program.id, week, day },
    include: {
      routine: { select: { id: true, title: true, difficulty: true, duration_minutes: true } },
    },
    orderBy: { order: "asc" },
  });

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const doneToday = await db.workout.findMany({
    where: { user_id: user.id, completed_at: { gte: todayStart } },
    select: { routine_id: true },
  });
  const doneIds = new Set(doneToday.map((w) => w.routine_id));

  return ok({
    program_id: assignment.program.id,
    program_name: assignment.program.name,
    week,
    day,
    tasks: items.map((it) => ({
      type: it.type,
      order: it.order,
      routine: it.routine ? { ...it.routine, completed: doneIds.has(it.routine.id) } : null,
      data: it.data ?? null,
    })),
  });
});
