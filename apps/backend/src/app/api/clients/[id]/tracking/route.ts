import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { programPosition, weekRange } from "@/lib/programs";
import type { ExerciseCompleted, Exercise } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

/** Seguimiento semanal de un cliente: días completados + pesos por ejercicio */
export const GET = handler(async (req: Request, { params }: Params) => {
  const { id: userId } = await params;
  const trainer = await requireTrainer();

  const assignment = await db.programAssignment.findFirst({
    where: { user_id: userId, is_active: true, program: { trainer_id: trainer.id, deleted_at: null } },
    include: {
      user: { select: { id: true, username: true, email: true, avatar_url: true, streak: true } },
      program: { select: { id: true, name: true } },
    },
  });
  if (!assignment) return fail("Client not found", 404);

  const now = new Date();
  const currentWeek = programPosition(assignment.start_date, now).week;
  const weekParam = parseInt(new URL(req.url).searchParams.get("week") ?? "", 10);
  const week = Number.isFinite(weekParam) ? Math.max(1, weekParam) : Math.max(1, currentWeek);
  const { start, end } = weekRange(assignment.start_date, week);

  const [items, workouts] = await Promise.all([
    db.programItem.findMany({
      where: { program_id: assignment.program.id, week },
      include: { routine: { select: { id: true, title: true, exercises: true } } },
      orderBy: [{ day: "asc" }, { order: "asc" }],
    }),
    db.workout.findMany({
      where: { user_id: userId, completed_at: { gte: start, lt: end } },
      select: {
        id: true,
        routine_id: true,
        completed_at: true,
        exercises_completed: true,
        trainer_feedback: true,
      },
    }),
  ]);

  // Solo tareas de rutina cuentan para el seguimiento de completado/pesos
  const routineItems = items.filter((it) => it.routine);

  // Mapa exercise_id → nombre a partir del Json de las rutinas de la semana
  const exerciseNames = new Map<string, string>();
  for (const item of routineItems) {
    for (const ex of item.routine!.exercises as unknown as Exercise[]) {
      // El log guarda ex.id del Json de la rutina; exercise_id (librería) como alias
      exerciseNames.set(ex.id, ex.name);
      if (ex.exercise_id) exerciseNames.set(ex.exercise_id, ex.name);
    }
  }

  // Cada workout marca como mucho UN item (una rutina puede repetirse en la semana)
  const available = [...workouts].sort(
    (a, b) => a.completed_at.getTime() - b.completed_at.getTime()
  );
  const days = routineItems.map((item) => {
    const idx = available.findIndex((w) => w.routine_id === item.routine!.id);
    const workout = idx >= 0 ? available.splice(idx, 1)[0] : null;
    return {
      day: item.day,
      order: item.order,
      routine: { id: item.routine!.id, title: item.routine!.title },
      completed: !!workout,
      workout_id: workout?.id ?? null,
      trainer_feedback: workout?.trainer_feedback ?? null,
    };
  });

  // Pesos registrados esta semana
  const weights = workouts.flatMap((w) =>
    (w.exercises_completed as unknown as ExerciseCompleted[])
      .filter((e) => e.weight_kg != null)
      .map((e) => ({
        exercise_id: e.exercise_id,
        exercise_name: exerciseNames.get(e.exercise_id) ?? e.exercise_id,
        weight_kg: e.weight_kg,
        reps_done: e.reps_done,
        date: w.completed_at,
      }))
  );

  // Observaciones del cliente por ejercicio: el entrenador las usa para
  // ajustar la rutina. La más reciente primero.
  const observations = [...workouts]
    .sort((a, b) => b.completed_at.getTime() - a.completed_at.getTime())
    .flatMap((w) =>
      (w.exercises_completed as unknown as ExerciseCompleted[])
        .filter((e) => e.note?.trim())
        .map((e) => ({
          exercise_id: e.exercise_id,
          exercise_name: exerciseNames.get(e.exercise_id) ?? e.exercise_id,
          note: e.note!.trim(),
          date: w.completed_at,
        }))
    );

  return ok({
    user: assignment.user,
    program: assignment.program,
    start_date: assignment.start_date,
    current_week: currentWeek,
    week,
    days,
    weights,
    observations,
  });
});
