import type { Workout } from "@truerep/shared";
import { exerciseContext, isRecord, setWarning } from "@/lib/exerciseHistory";

function workout(date: string, sets: { reps: number; weight_kg?: number }[] | undefined): Workout {
  return {
    id: date,
    user_id: "u1",
    routine_id: "r1",
    completed_at: `${date}T10:00:00.000Z`,
    duration_minutes: 40,
    exercises_completed: [{ exercise_id: "e1", reps_done: 0, felt_like: "medium", sets }],
    xp_earned: 0,
    notes: null,
  };
}

// Llegan en cualquier orden: el contexto no puede depender de cómo los ordene la API
const history = [
  workout("2026-09-19", [{ reps: 7, weight_kg: 12.5 }, { reps: 6, weight_kg: 12.5 }]),
  workout("2026-09-26", [{ reps: 6, weight_kg: 15 }, { reps: 5, weight_kg: 15 }]),
  workout("2026-09-10", undefined), // workout antiguo sin desglose por serie
  workout("2026-09-22", [{ reps: 6, weight_kg: 15 }, { reps: 5, weight_kg: 12.5 }]),
  workout("2026-09-01", [{ reps: 3, weight_kg: 10 }]),
];

describe("exerciseContext", () => {
  const ctx = exerciseContext(history, "e1");

  it("coge las 3 últimas sesiones con series, la más reciente primero", () => {
    expect(ctx.sessions.map((s) => s.date.slice(0, 10))).toEqual(["2026-09-26", "2026-09-22", "2026-09-19"]);
  });

  it("el récord es la serie con más lastre y, a igual lastre, más reps", () => {
    expect(ctx.best).toEqual({ reps: 6, weight_kg: 15 });
  });

  it("la tendencia compara la carga de la última sesión con la más antigua de las 3", () => {
    // 6·15+5·15 = 165 frente a 7·12,5+6·12,5 = 162,5 → +2 %
    expect(ctx.trendPct).toBe(2);
  });

  it("sin historial no hay récord ni tendencia", () => {
    expect(exerciseContext([], "e1")).toEqual({
      sessions: [],
      best: null,
      average: null,
      trendPct: null,
      lastNote: null,
    });
  });
});

describe("isRecord", () => {
  it("batir el récord en lastre o, a igual lastre, en reps", () => {
    expect(isRecord({ reps: 3, weight_kg: 17.5 }, { reps: 6, weight_kg: 15 })).toBe(true);
    expect(isRecord({ reps: 7, weight_kg: 15 }, { reps: 6, weight_kg: 15 })).toBe(true);
    expect(isRecord({ reps: 6, weight_kg: 15 }, { reps: 6, weight_kg: 15 })).toBe(false);
  });

  it("la primera vez no hay récord que celebrar", () => {
    expect(isRecord({ reps: 10 }, null)).toBe(false);
  });
});

describe("setWarning", () => {
  it("avisa de un lastre que se aleja más de un 25 % de la última vez", () => {
    expect(setWarning({ reps: 5, weight_kg: 25 }, { reps: 5, weight_kg: 15 })).toMatch(/67 % más/);
    expect(setWarning({ reps: 5, weight_kg: 17.5 }, { reps: 5, weight_kg: 15 })).toBeNull();
  });

  it("avisa de reps muy por encima y de series a cero", () => {
    expect(setWarning({ reps: 50 }, { reps: 12 })).toMatch(/muy por encima/);
    expect(setWarning({ reps: 0 }, undefined)).toMatch(/no contará/);
  });
});

describe("ejercicios por segundos", () => {
  it("el récord y los avisos comparan segundos", () => {
    expect(isRecord({ reps: 0, seconds: 30 }, { reps: 0, seconds: 25 })).toBe(true);
    expect(setWarning({ reps: 0, seconds: 90 }, { reps: 0, seconds: 30 })).toMatch(/90 s, muy por encima/);
    expect(setWarning({ reps: 0, seconds: 0 }, undefined)).toMatch(/sin segundos/);
  });
});

describe("observaciones", () => {
  it("devuelve la observación más reciente del ejercicio, aunque ese workout no tenga series", () => {
    const withNote = (date: string, note: string): Workout => ({
      ...workout(date, undefined),
      exercises_completed: [{ exercise_id: "e1", reps_done: 10, felt_like: "medium", note }],
    });
    const ctx = exerciseContext(
      [withNote("2026-09-20", "hombro cargado"), withNote("2026-09-27", "  molestia en la 3ª serie "), withNote("2026-09-28", "  ")],
      "e1"
    );
    expect(ctx.lastNote).toEqual({ date: "2026-09-27T10:00:00.000Z", text: "molestia en la 3ª serie" });
  });
});
