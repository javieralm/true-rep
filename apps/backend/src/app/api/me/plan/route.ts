import { db } from "@/lib/db";
import { ok, handler } from "@/lib/api";
import { requirePremium } from "@/lib/auth";
import { programPosition, weekRange } from "@/lib/programs";
import type { ClientPlan, ProgramTaskData } from "@truerep/shared";

/** Cuántos mensajes/vídeos/notas del entrenador se devuelven como máximo. */
const MESSAGES_LIMIT = 20;

/** La semana del programa asignado, el entrenador que lo asignó y lo que le ha
 * enviado. Misma puerta que /me/schedule: los programas personalizados son
 * Premium. Sin programa asignado responde null, que no es un error. */
export const GET = handler(async () => {
  const user = await requirePremium();

  const assignment = await db.programAssignment.findFirst({
    where: { user_id: user.id, is_active: true, program: { deleted_at: null } },
    include: {
      program: {
        select: { id: true, name: true, trainer: { select: { id: true, username: true, avatar_url: true } } },
      },
    },
    orderBy: { created_at: "desc" },
  });
  if (!assignment) return ok(null);

  const now = new Date();
  const position = programPosition(assignment.start_date, now);
  const started = position.week > 0;
  const week = started ? position.week : 1;

  const [items, messages] = await Promise.all([
    db.programItem.findMany({
      where: { program_id: assignment.program.id, week },
      include: {
        routine: { select: { id: true, title: true, difficulty: true, duration_minutes: true } },
      },
      orderBy: [{ day: "asc" }, { order: "asc" }],
    }),
    // Solo lo ya "enviado": semanas anteriores enteras y la actual hasta hoy.
    // Lo programado para mañana no se enseña antes de tiempo.
    started
      ? db.programItem.findMany({
          where: {
            program_id: assignment.program.id,
            type: { in: ["MESSAGE", "VIDEO", "NOTE"] },
            OR: [{ week: { lt: week } }, { week, day: { lte: position.day } }],
          },
          orderBy: [{ week: "desc" }, { day: "desc" }, { order: "desc" }],
          take: MESSAGES_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  // Una rutina está hecha si hay un workout suyo el mismo día del programa.
  const { start, end } = weekRange(assignment.start_date, week);
  const workouts = await db.workout.findMany({
    where: { user_id: user.id, completed_at: { gte: start, lt: end } },
    select: { routine_id: true, completed_at: true },
  });
  const done = new Set(
    workouts.map((w) => `${programPosition(assignment.start_date, w.completed_at).day}:${w.routine_id}`)
  );

  const plan: ClientPlan = {
    program_id: assignment.program.id,
    program_name: assignment.program.name,
    started,
    week,
    day: started ? position.day : 0,
    trainer: assignment.program.trainer,
    days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      day,
      tasks: items
        .filter((it) => it.day === day)
        .map((it) => ({
          type: it.type,
          order: it.order,
          routine: it.routine ? { ...it.routine, completed: done.has(`${day}:${it.routine.id}`) } : null,
          data: (it.data as ProgramTaskData | null) ?? null,
        })),
    })),
    messages: messages.map((m) => ({
      week: m.week,
      day: m.day,
      type: m.type,
      data: (m.data as ProgramTaskData | null) ?? null,
    })),
  };
  return ok(plan);
});
