import type { Routine } from "@truerep/shared";
import { toPayload, useWorkoutStore } from "@/state/workoutStore";

function routine(id: string, exercises: { id: string; sets?: number; reps?: string }[]): Routine {
  return {
    id,
    trainer_id: "t1",
    title: `Rutina ${id}`,
    description: "",
    difficulty: "BEGINNER",
    duration_minutes: 20,
    exercises: exercises.map((e) => ({ ...e, name: `Ejercicio ${e.id}` })),
    preview_video_url: null,
    is_published: true,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

// e1 prescribe 3 series de 10; e2 no dice nada
const A = routine("r1", [{ id: "e1", sets: 3, reps: "10" }, { id: "e2" }]);
const B = routine("r2", [{ id: "e9" }]);

const store = () => useWorkoutStore.getState();
const entry = (id: string) => store().completed.find((c) => c.exercise_id === id);

beforeEach(() => {
  store().reset();
});

describe("workoutStore · series", () => {
  it("marcar un ejercicio precarga las series que prescribe la rutina", () => {
    store().start(A);
    store().toggleExercise("e1");

    expect(entry("e1")?.sets).toEqual([{ reps: 10 }, { reps: 10 }, { reps: 10 }]);
  });

  it("un ejercicio sin sets prescritos arranca con una sola serie a 0", () => {
    store().start(A);
    store().toggleExercise("e2");

    expect(entry("e2")?.sets).toEqual([{ reps: 0 }]);
  });

  it("saca las reps por defecto de un rango como '8-12'", () => {
    store().start(routine("r3", [{ id: "e3", sets: 2, reps: "8-12" }]));
    store().toggleExercise("e3");

    expect(entry("e3")?.sets).toEqual([{ reps: 8 }, { reps: 8 }]);
  });

  it("se pueden editar reps y peso de cada serie por separado", () => {
    store().start(A);
    store().toggleExercise("e1");

    store().setSetReps("e1", 0, 12);
    store().setSetWeight("e1", 0, 20);
    store().setSetWeight("e1", 2, 25);

    expect(entry("e1")?.sets).toEqual([
      { reps: 12, weight_kg: 20 },
      { reps: 10 },
      { reps: 10, weight_kg: 25 },
    ]);
  });

  it("añadir una serie hereda reps y peso de la última", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetWeight("e1", 2, 25);

    store().addSet("e1");

    expect(entry("e1")?.sets).toHaveLength(4);
    expect(entry("e1")?.sets?.[3]).toEqual({ reps: 10, weight_kg: 25 });
  });
});

describe("workoutStore · agregados que consume el backend", () => {
  // reps_done y weight_kg son lo que leen me/stats, el export CSV y el
  // auto-escalado. Se derivan de las series y nunca se editan a mano.
  it("reps_done es la suma de las series", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetReps("e1", 0, 12);
    store().setSetReps("e1", 1, 10);
    store().setSetReps("e1", 2, 8);

    expect(entry("e1")?.reps_done).toBe(30);
  });

  it("weight_kg es el de la serie más pesada, no el último ni la media", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetWeight("e1", 0, 20);
    store().setSetWeight("e1", 1, 30);
    store().setSetWeight("e1", 2, 25);

    expect(entry("e1")?.weight_kg).toBe(30);
  });

  it("sin pesos, weight_kg queda sin definir en vez de 0", () => {
    store().start(A);
    store().toggleExercise("e1");

    expect(entry("e1")?.weight_kg).toBeUndefined();
  });

  it("los agregados se recalculan al añadir series", () => {
    store().start(A);
    store().toggleExercise("e2");
    store().setSetReps("e2", 0, 5);
    store().setSetWeight("e2", 0, 40);

    store().addSet("e2");
    expect(entry("e2")?.reps_done).toBe(10);

    store().setSetWeight("e2", 1, 10);
    expect(entry("e2")?.weight_kg).toBe(40);
  });
});

describe("workoutStore · marcar y sensación", () => {
  it("toggleExercise dos veces sobre el mismo ejercicio lo quita", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().toggleExercise("e1");

    expect(store().completed).toEqual([]);
  });

  it("setFeltLike solo toca el ejercicio indicado y no altera las series", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().toggleExercise("e2");

    store().setFeltLike("e1", "hard");

    expect(entry("e1")?.felt_like).toBe("hard");
    expect(entry("e2")?.felt_like).toBe("medium");
    expect(entry("e1")?.sets).toHaveLength(3);
  });
});

describe("workoutStore · no perder una sesión en curso", () => {
  // El fallo que esto vigila: al salir de la sesión y volver a entrar desde el
  // detalle de la rutina, "Empezar entrenamiento" llamaba a start() otra vez y
  // hacía completed: [], borrando en silencio todo lo registrado.
  it("start() sobre la rutina que ya está en curso conserva lo marcado", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetReps("e1", 0, 15);
    const startedAt = store().startedAt;

    store().start(A);

    expect(entry("e1")?.sets?.[0]).toEqual({ reps: 15 });
    expect(store().startedAt).toBe(startedAt); // el cronómetro tampoco se reinicia
  });

  it("start() sobre la misma rutina sin nada marcado sí reinicia el cronómetro", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T10:00:00Z"));
    store().start(A);
    const first = store().startedAt;

    jest.setSystemTime(new Date("2026-01-01T11:00:00Z"));
    store().start(A);

    expect(store().startedAt).not.toBe(first);
    jest.useRealTimers();
  });

  it("start() sobre una rutina distinta empieza de cero", () => {
    store().start(A);
    store().toggleExercise("e1");

    store().start(B);

    expect(store().activeRoutine?.id).toBe("r2");
    expect(store().completed).toEqual([]);
  });

  it("reset() deja el store vacío", () => {
    store().start(A);
    store().toggleExercise("e1");

    store().reset();

    expect(store().activeRoutine).toBeNull();
    expect(store().startedAt).toBeNull();
    expect(store().completed).toEqual([]);
  });
});

describe("workoutStore · series marcadas y precarga", () => {
  it("con historial, marcar precarga las series de la última vez en vez de lo prescrito", () => {
    store().start(A);
    store().toggleExercise("e1", undefined, [{ reps: 6, weight_kg: 15 }, { reps: 5, weight_kg: 15 }]);

    expect(entry("e1")?.sets).toEqual([{ reps: 6, weight_kg: 15 }, { reps: 5, weight_kg: 15 }]);
  });

  it("una serie añadida llega sin marcar aunque la anterior lo esté", () => {
    store().start(A);
    store().toggleExercise("e2");
    store().setSetDone("e2", 0, true);

    store().addSet("e2");

    expect(entry("e2")?.sets[1].done).toBeUndefined();
  });

  it("copiar otra sesión cambia los valores pero respeta qué series estaban hechas", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetDone("e1", 0, true);

    store().replaceSets("e1", [{ reps: 8, weight_kg: 20 }, { reps: 7 }]);

    expect(entry("e1")?.sets).toEqual([{ reps: 8, weight_kg: 20, done: true }, { reps: 7 }]);
  });
});

describe("toPayload · lo que llega al backend", () => {
  it("solo manda series hechas con reps, sin la marca local, y recalcula agregados", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().setSetWeight("e1", 0, 20);
    store().setSetWeight("e1", 1, 30);
    store().setSetDone("e1", 0, true);

    const [e1] = toPayload(store().completed);

    expect(e1.sets).toEqual([{ reps: 10, weight_kg: 20 }]);
    expect(e1.reps_done).toBe(10);
    expect(e1.weight_kg).toBe(20); // la serie de 30 no se hizo: no cuenta
  });

  it("un ejercicio tocado sin ninguna serie hecha no se envía", () => {
    store().start(A);
    store().toggleExercise("e1");
    store().toggleExercise("e2");
    store().setAllSetsDone("e2", true);
    store().setSetReps("e2", 0, 0);

    expect(toPayload(store().completed)).toEqual([]);
  });
});

describe("ejercicios por segundos (L-sit, plancha)", () => {
  const timed = routine("r5", [{ id: "e5", sets: 2, reps: "20" }]);
  timed.exercises[0].measure = "seconds";

  it("el objetivo de la rutina se precarga como segundos, no como reps", () => {
    store().start(timed);
    store().toggleExercise("e5");

    expect(entry("e5")?.sets).toEqual([{ reps: 0, seconds: 20 }, { reps: 0, seconds: 20 }]);
  });

  it("una serie hecha con segundos se envía aunque tenga 0 reps", () => {
    store().start(timed);
    store().toggleExercise("e5");
    store().setSetSeconds("e5", 0, 25);
    store().setSetDone("e5", 0, true);

    expect(toPayload(store().completed)[0].sets).toEqual([{ reps: 0, seconds: 25 }]);
  });
});
