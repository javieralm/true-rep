import { db } from "@/lib/db";
import { fail, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { toCsvRow } from "@/lib/csv";
import type { Exercise, ExerciseCompleted } from "@truerep/shared";

type Params = { params: Promise<{ id: string }> };

const CSV_HEADER = [
  "fecha",
  "rutina",
  "ejercicio",
  "reps",
  "peso_kg",
  "percepcion",
  "duracion_min",
  "xp",
  "notas_cliente",
  "feedback_coach",
];

/** Export CSV crudo del historial de un cliente para el coach. Sin PDF: CSV se
 * abre directo en Excel/Sheets y cubre el mismo caso de uso sin deps nuevas —
 * si hace falta un PDF con marca propia, se añade después. */
export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id: userId } = await params;
  const trainer = await requireTrainer();

  const assignment = await db.programAssignment.findFirst({
    where: { user_id: userId, is_active: true, program: { trainer_id: trainer.id, deleted_at: null } },
    include: { user: { select: { username: true } } },
  });
  if (!assignment) return fail("Client not found", 404);

  const workouts = await db.workout.findMany({
    where: { user_id: userId },
    orderBy: { completed_at: "asc" },
    select: {
      completed_at: true,
      duration_minutes: true,
      xp_earned: true,
      notes: true,
      trainer_feedback: true,
      exercises_completed: true,
      routine: { select: { title: true, exercises: true } },
    },
  });

  const rows = [CSV_HEADER.join(",")];
  for (const w of workouts) {
    const exerciseNames = new Map<string, string>();
    for (const ex of w.routine.exercises as unknown as Exercise[]) {
      exerciseNames.set(ex.id, ex.name);
      if (ex.exercise_id) exerciseNames.set(ex.exercise_id, ex.name);
    }
    for (const e of w.exercises_completed as unknown as ExerciseCompleted[]) {
      rows.push(
        toCsvRow([
          w.completed_at.toISOString(),
          w.routine.title,
          exerciseNames.get(e.exercise_id) ?? e.exercise_id,
          e.reps_done,
          e.weight_kg ?? "",
          e.felt_like,
          w.duration_minutes,
          w.xp_earned,
          w.notes ?? "",
          w.trainer_feedback ?? "",
        ])
      );
    }
  }

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${assignment.user.username}-historial.csv"`,
    },
  });
});
