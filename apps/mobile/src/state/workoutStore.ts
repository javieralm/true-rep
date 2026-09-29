import { create } from "zustand";
import type { Routine, Exercise, ExerciseCompleted, CompletedSet } from "@truerep/shared";

/** Una serie mientras se entrena. `done` es local: solo las series marcadas
 * como hechas llegan al backend (ver toPayload). Se omite en vez de guardar
 * `false`, así una serie sin marcar es exactamente un CompletedSet. */
export interface SessionSet extends CompletedSet {
  done?: true;
}

export interface SessionExercise extends ExerciseCompleted {
  sets: SessionSet[];
}

interface WorkoutState {
  activeRoutine: Routine | null;
  startedAt: number | null;
  /** Ejercicios tocados en la sesión, con sus series hechas o pendientes. */
  completed: SessionExercise[];
  start: (routine: Routine) => void;
  /** Añade el ejercicio (o lo quita si ya estaba). `prefill` son las series de
   * la última vez; sin ellas se usa lo que prescribe la rutina. */
  toggleExercise: (
    exerciseId: string,
    feltLike?: ExerciseCompleted["felt_like"],
    prefill?: CompletedSet[]
  ) => void;
  setSetReps: (exerciseId: string, index: number, reps: number) => void;
  setSetSeconds: (exerciseId: string, index: number, seconds: number) => void;
  /** Cambia todas las series del ejercicio a repeticiones o a segundos,
   *  conservando el número escrito. */
  setUnit: (exerciseId: string, unit: "reps" | "seconds") => void;
  setSetWeight: (exerciseId: string, index: number, weightKg: number | undefined) => void;
  setSetDone: (exerciseId: string, index: number, done: boolean) => void;
  setAllSetsDone: (exerciseId: string, done: boolean) => void;
  /** Sustituye reps y peso por los de otra sesión, respetando qué series ya
   * estaban marcadas. */
  replaceSets: (exerciseId: string, sets: CompletedSet[]) => void;
  addSet: (exerciseId: string) => void;
  /** Quita una serie; nunca la última que queda. */
  removeSet: (exerciseId: string, index: number) => void;
  setFeltLike: (exerciseId: string, feltLike: ExerciseCompleted["felt_like"]) => void;
  setNote: (exerciseId: string, note: string) => void;
  reset: () => void;
}

/** Reps por defecto de una serie a partir de lo que prescribe la rutina.
 *
 * `reps` es texto libre porque el trainer escribe cosas como "10", "8-12" o
 * "al fallo". Se coge el primer número que aparezca y si no hay ninguno se
 * empieza en 0, que el usuario corrige: inventarse un 1 hace que una serie sin
 * tocar parezca registrada. */
function defaultReps(exercise: Exercise | undefined): number {
  const match = exercise?.reps?.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/** Series iniciales de un ejercicio: tantas como prescriba la rutina. */
export function initialSets(exercise: Exercise | undefined): CompletedSet[] {
  const count = Math.max(1, exercise?.sets ?? 1);
  const reps = defaultReps(exercise);
  // Siempre en repeticiones: aunque el ejercicio admita segundos, el cliente
  // los elige al registrar (setUnit). Si la última vez usó segundos, la
  // precarga de esa sesión ya llega en segundos.
  return Array.from({ length: count }, () => ({ reps }));
}

/** Los agregados que consumen stats, export y auto-escalado se derivan siempre
 * de las series; nunca se editan a mano. `weight_kg` es el de la serie más
 * pesada, que es la que tiene sentido para progresar. */
function withAggregates<T extends ExerciseCompleted>(entry: T): T {
  const sets = entry.sets ?? [];
  const weights = sets.map((s) => s.weight_kg).filter((w): w is number => w != null);
  return {
    ...entry,
    reps_done: sets.reduce((sum, s) => sum + s.reps, 0),
    weight_kg: weights.length > 0 ? Math.max(...weights) : undefined,
  };
}

/** Copia limpia de una serie: sin `done` y sin `weight_kg: undefined`. */
function plainSet(s: CompletedSet): CompletedSet {
  return {
    reps: s.reps,
    ...(s.seconds != null ? { seconds: s.seconds } : {}),
    ...(s.weight_kg != null ? { weight_kg: s.weight_kg } : {}),
  };
}

/** Lo que se manda a POST /workouts/log: solo las series marcadas como hechas
 * y con alguna repetición. Un ejercicio sin ninguna así no se envía. Los
 * agregados se recalculan sobre esas series, no sobre las pendientes. */
export function toPayload(completed: SessionExercise[]): ExerciseCompleted[] {
  return completed.flatMap((c) => {
    const sets = c.sets.filter((s) => s.done && (s.seconds ?? s.reps) > 0).map(plainSet);
    // Una observación en blanco no se guarda: en la próxima sesión no hay nada que enseñar.
    const { note, ...rest } = c;
    const text = note?.trim();
    return sets.length > 0 ? [withAggregates({ ...rest, ...(text ? { note: text } : {}), sets })] : [];
  });
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeRoutine: null,
  startedAt: null,
  completed: [],

  start: (routine) => {
    const { activeRoutine, completed } = get();
    // Reanudar, no reiniciar. Volver a entrar en la rutina que ya está en curso
    // no puede borrar lo registrado: antes, salir de la sesión y pulsar otra vez
    // "Empezar entrenamiento" vaciaba completed en silencio y se perdían todas
    // las series marcadas. Con nada marcado sí se reinicia, que es lo que espera
    // quien vuelve a empezar de cero.
    //
    // No se refresca activeRoutine a propósito: si el trainer edita la rutina a
    // mitad de sesión, los exercise_id que el usuario ya ha marcado tienen que
    // seguir existiendo.
    if (activeRoutine?.id === routine.id && completed.length > 0) return;
    set({ activeRoutine: routine, startedAt: Date.now(), completed: [] });
  },

  toggleExercise: (exerciseId, feltLike = "medium", prefill) => {
    const { completed, activeRoutine } = get();
    const exists = completed.some((c) => c.exercise_id === exerciseId);
    if (exists) {
      set({ completed: completed.filter((c) => c.exercise_id !== exerciseId) });
      return;
    }
    // Al marcarlo se precargan las series de la última vez; si no hay historial,
    // las que pide la rutina: si prescribe 3, aparecen 3 listas para rellenar.
    const exercise = activeRoutine?.exercises.find((e) => e.id === exerciseId);
    set({
      completed: [
        ...completed,
        withAggregates({
          exercise_id: exerciseId,
          reps_done: 0,
          felt_like: feltLike,
          sets: prefill?.length ? prefill.map(plainSet) : initialSets(exercise),
        }),
      ],
    });
  },

  setSetReps: (exerciseId, index, reps) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? withAggregates({
              ...c,
              sets: (c.sets ?? []).map((s, i) => (i === index ? { ...s, reps } : s)),
            })
          : c
      ),
    });
  },

  setSetSeconds: (exerciseId, index, seconds) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? { ...c, sets: c.sets.map((s, i) => (i === index ? { ...s, reps: 0, seconds } : s)) }
          : c
      ),
    });
  },

  setUnit: (exerciseId, unit) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? withAggregates({
              ...c,
              sets: c.sets.map((s) => {
                const { seconds, ...rest } = s;
                return unit === "seconds"
                  ? { ...rest, reps: 0, seconds: seconds ?? s.reps }
                  : { ...rest, reps: s.reps || seconds || 0 };
              }),
            })
          : c
      ),
    });
  },

  setSetWeight: (exerciseId, index, weightKg) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? withAggregates({
              ...c,
              sets: (c.sets ?? []).map((s, i) => (i === index ? { ...s, weight_kg: weightKg } : s)),
            })
          : c
      ),
    });
  },

  setSetDone: (exerciseId, index, done) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? { ...c, sets: c.sets.map((s, i) => (i === index ? (done ? { ...s, done: true } : plainSet(s)) : s)) }
          : c
      ),
    });
  },

  setAllSetsDone: (exerciseId, done) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? { ...c, sets: c.sets.map((s) => (done ? { ...s, done: true } : plainSet(s))) }
          : c
      ),
    });
  },

  replaceSets: (exerciseId, sets) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId
          ? withAggregates({
              ...c,
              sets: sets.map((s, i) => (c.sets[i]?.done ? { ...plainSet(s), done: true } : plainSet(s))),
            })
          : c
      ),
    });
  },

  // Una serie de más: se hizo más de lo prescrito. Hereda reps y peso de la
  // última, que es lo más probable que repita y ahorra teclear. Llega sin
  // marcar: se marca al hacerla.
  addSet: (exerciseId) => {
    set({
      completed: get().completed.map((c) => {
        if (c.exercise_id !== exerciseId) return c;
        const last = c.sets[c.sets.length - 1];
        return withAggregates({ ...c, sets: [...c.sets, last ? plainSet(last) : { reps: 0 }] });
      }),
    });
  },

  // Para la serie añadida por error. Un ejercicio marcado con cero series no
  // significa nada: para quitarlo entero se desmarca el ejercicio.
  removeSet: (exerciseId, index) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId && c.sets.length > 1
          ? withAggregates({ ...c, sets: c.sets.filter((_, i) => i !== index) })
          : c
      ),
    });
  },

  setFeltLike: (exerciseId, feltLike) => {
    set({
      completed: get().completed.map((c) =>
        c.exercise_id === exerciseId ? { ...c, felt_like: feltLike } : c
      ),
    });
  },

  setNote: (exerciseId, note) => {
    set({
      completed: get().completed.map((c) => (c.exercise_id === exerciseId ? { ...c, note } : c)),
    });
  },

  reset: () => set({ activeRoutine: null, startedAt: null, completed: [] }),
}));
