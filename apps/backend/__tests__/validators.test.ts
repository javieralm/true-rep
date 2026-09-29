import { describe, it, expect } from "vitest";
import {
  inviteClientSchema,
  trainerPricesSchema,
  updateClientSchema,
  createRoutineSchema,
  logWorkoutSchema,
  createChallengeSchema,
  createExerciseSchema,
  updateProgramSchema,
  assignProgramSchema,
  pushTokenSchema,
  preferencesSchema,
  createProgramSchema,
  workoutFeedbackSchema,
  programItemSchema,
} from "@truerep/shared";
import { calcXp, nextStreak } from "../src/lib/gamification";

const validRoutine = {
  title: "Upper Body Push",
  description: "Chest, shoulders, triceps",
  difficulty: "INTERMEDIATE",
  duration_minutes: 45,
  exercises: [{ id: "push-ups-1", name: "Push-ups", reps: "3x12" }],
};

describe("createRoutineSchema", () => {
  it("accepts a valid routine", () => {
    expect(() => createRoutineSchema.parse(validRoutine)).not.toThrow();
  });
  it("rejects short title", () => {
    expect(() => createRoutineSchema.parse({ ...validRoutine, title: "abc" })).toThrow();
  });
  it("rejects empty exercises", () => {
    expect(() => createRoutineSchema.parse({ ...validRoutine, exercises: [] })).toThrow();
  });
  it("rejects invalid difficulty", () => {
    expect(() => createRoutineSchema.parse({ ...validRoutine, difficulty: "expert" })).toThrow();
  });
  it("rejects duplicate exercise ids", () => {
    expect(() =>
      createRoutineSchema.parse({
        ...validRoutine,
        exercises: [
          { id: "push-ups-1", name: "Push-ups", reps: "3x12" },
          { id: "push-ups-1", name: "Push-ups (again)", reps: "3x10" },
        ],
      })
    ).toThrow();
  });
});

describe("logWorkoutSchema", () => {
  const validLog = {
    routine_id: "r1",
    duration_minutes: 42,
    exercises_completed: [{ exercise_id: "e1", reps_done: 12, felt_like: "hard" }],
    idempotency_key: "11111111-1111-1111-1111-111111111111",
  };

  it("accepts a valid workout log", () => {
    expect(() => logWorkoutSchema.parse(validLog)).not.toThrow();
  });
  it("rejects invalid felt_like", () => {
    expect(() =>
      logWorkoutSchema.parse({
        ...validLog,
        exercises_completed: [{ exercise_id: "e1", reps_done: 12, felt_like: "brutal" }],
      })
    ).toThrow();
  });

  // El desglose por serie se añadió después. Es opcional a propósito: los
  // workouts ya guardados no lo tienen y reps_done/weight_kg siguen siendo los
  // agregados que leen stats, el export y el auto-escalado.
  it("accepts a per-set breakdown", () => {
    expect(() =>
      logWorkoutSchema.parse({
        ...validLog,
        exercises_completed: [
          {
            exercise_id: "e1",
            reps_done: 30,
            weight_kg: 30,
            felt_like: "medium",
            sets: [
              { reps: 12, weight_kg: 20 },
              { reps: 10, weight_kg: 30 },
              { reps: 8 },
            ],
          },
        ],
      })
    ).not.toThrow();
  });
  it("still accepts an entry without sets", () => {
    expect(() => logWorkoutSchema.parse(validLog)).not.toThrow();
  });
  it("rejects a set with negative reps", () => {
    expect(() =>
      logWorkoutSchema.parse({
        ...validLog,
        exercises_completed: [
          { exercise_id: "e1", reps_done: 0, felt_like: "easy", sets: [{ reps: -1 }] },
        ],
      })
    ).toThrow();
  });
  it("rejects an absurd number of sets", () => {
    expect(() =>
      logWorkoutSchema.parse({
        ...validLog,
        exercises_completed: [
          {
            exercise_id: "e1",
            reps_done: 0,
            felt_like: "easy",
            sets: Array.from({ length: 31 }, () => ({ reps: 1 })),
          },
        ],
      })
    ).toThrow();
  });
  it("requires idempotency_key to be a UUID", () => {
    const { idempotency_key: _drop, ...withoutKey } = validLog;
    expect(() => logWorkoutSchema.parse(withoutKey)).toThrow();
    expect(() => logWorkoutSchema.parse({ ...validLog, idempotency_key: "not-a-uuid" })).toThrow();
  });
});

describe("logWorkoutSchema weight_kg", () => {
  it("accepts optional weight and rejects negatives", () => {
    const log = (weight_kg?: number) => ({
      routine_id: "r1",
      duration_minutes: 30,
      exercises_completed: [{ exercise_id: "e1", reps_done: 8, weight_kg, felt_like: "medium" }],
      idempotency_key: "11111111-1111-1111-1111-111111111111",
    });
    expect(() => logWorkoutSchema.parse(log(20))).not.toThrow();
    expect(() => logWorkoutSchema.parse(log(undefined))).not.toThrow();
    expect(() => logWorkoutSchema.parse(log(-5))).toThrow();
  });
});

describe("createExerciseSchema", () => {
  it("accepts minimal exercise and rejects short name", () => {
    expect(() => createExerciseSchema.parse({ name: "Dominada prono" })).not.toThrow();
    expect(() => createExerciseSchema.parse({ name: "D" })).toThrow();
    expect(() => createExerciseSchema.parse({ name: "Dips", video_url: "not-a-url" })).toThrow();
  });
});

describe("updateProgramSchema", () => {
  it("valida items con week/day en rango", () => {
    const items = (day: number) => ({ items: [{ week: 1, day, order: 0, routine_id: "r1" }] });
    expect(() => updateProgramSchema.parse(items(7))).not.toThrow();
    expect(() => updateProgramSchema.parse(items(8))).toThrow();
    expect(() => updateProgramSchema.parse(items(0))).toThrow();
  });
});

describe("programItemSchema (tareas multi-tipo)", () => {
  const base = { week: 1, day: 1, order: 0 };
  it("ROUTINE por defecto y exige routine_id", () => {
    expect(() => programItemSchema.parse({ ...base, routine_id: "r1" })).not.toThrow();
    expect(() => programItemSchema.parse({ ...base, type: "ROUTINE" })).toThrow();
  });
  it("VIDEO exige data.url válida", () => {
    expect(() =>
      programItemSchema.parse({ ...base, type: "VIDEO", data: { url: "https://youtu.be/x" } })
    ).not.toThrow();
    expect(() => programItemSchema.parse({ ...base, type: "VIDEO", data: { title: "sin url" } })).toThrow();
  });
  it("MESSAGE/NOTE/SESSION exigen título o cuerpo", () => {
    expect(() => programItemSchema.parse({ ...base, type: "MESSAGE", data: { body: "hola" } })).not.toThrow();
    expect(() => programItemSchema.parse({ ...base, type: "NOTE", data: { title: "Cardio" } })).not.toThrow();
    expect(() => programItemSchema.parse({ ...base, type: "SESSION", data: {} })).toThrow();
  });
});

describe("assignProgramSchema", () => {
  it("requiere user_id y fecha ISO", () => {
    expect(() =>
      assignProgramSchema.parse({ user_id: "u1", start_date: "2026-07-20T00:00:00Z" })
    ).not.toThrow();
    expect(() => assignProgramSchema.parse({ user_id: "u1", start_date: "20/07/2026" })).toThrow();
  });
});

describe("createChallengeSchema", () => {
  it("rejects ends_at before starts_at", () => {
    expect(() =>
      createChallengeSchema.parse({
        title: "100 Push-ups",
        description: "Do them all",
        difficulty: "BEGINNER",
        starts_at: "2026-07-20T00:00:00Z",
        ends_at: "2026-07-10T00:00:00Z",
        xp_reward: 100,
      })
    ).toThrow();
  });
});

describe("createProgramSchema", () => {
  it("acepta nombre válido y rechaza corto", () => {
    expect(() => createProgramSchema.parse({ name: "Fuerza 12 semanas" })).not.toThrow();
    expect(() => createProgramSchema.parse({ name: "F" })).toThrow();
  });
});

describe("workoutFeedbackSchema", () => {
  it("exige feedback de 3-2000 caracteres", () => {
    expect(() => workoutFeedbackSchema.parse({ feedback: "Buen trabajo con las dominadas" })).not.toThrow();
    expect(() => workoutFeedbackSchema.parse({ feedback: "ok" })).toThrow();
    expect(() => workoutFeedbackSchema.parse({ feedback: "x".repeat(2001) })).toThrow();
  });
});

describe("push schemas", () => {
  it("pushTokenSchema exige formato Expo", () => {
    expect(() => pushTokenSchema.parse({ token: "ExponentPushToken[abc123]" })).not.toThrow();
    expect(() => pushTokenSchema.parse({ token: "fcm-token-123" })).toThrow();
  });
  it("preferencesSchema valida hora 0-23", () => {
    expect(() => preferencesSchema.parse({ reminder_hour: 19 })).not.toThrow();
    expect(() => preferencesSchema.parse({ reminder_hour: 24 })).toThrow();
    expect(() => preferencesSchema.parse({ reminder_enabled: false, timezone: "Europe/Madrid" })).not.toThrow();
  });
});

describe("gamification", () => {
  it("calcXp: base + duration bonus, streak multiplier", () => {
    expect(calcXp(10, 0)).toBe(15); // 10 base + 5 bonus, sin racha
    expect(calcXp(45, 5)).toBe(Math.round(30 * 1.25));
  });
  it("nextStreak: increments on consecutive day, resets after a gap", () => {
    const now = new Date("2026-07-11T10:00:00Z");
    expect(nextStreak(5, new Date("2026-07-10T22:00:00Z"), now)).toBe(6);
    expect(nextStreak(5, new Date("2026-07-11T06:00:00Z"), now)).toBe(5); // mismo día
    expect(nextStreak(5, new Date("2026-07-08T10:00:00Z"), now)).toBe(1); // racha rota
    expect(nextStreak(0, null, now)).toBe(1); // primer workout
  });
});

describe("inviteClientSchema", () => {
  it("normaliza el email a minúsculas y sin espacios", () => {
    const r = inviteClientSchema.parse({ email: "  Ana@Mail.COM ", billing: "CASH" });
    expect(r.email).toBe("ana@mail.com");
  });

  it("rechaza emails inválidos, formas de pago desconocidas y fechas mal formadas", () => {
    expect(inviteClientSchema.safeParse({ email: "ana", billing: "CASH" }).success).toBe(false);
    expect(inviteClientSchema.safeParse({ email: "a@b.com", billing: "PAYPAL" }).success).toBe(false);
    expect(inviteClientSchema.safeParse({ email: "a@b.com", billing: "CASH", paid_until: "29/09/2026" }).success).toBe(false);
  });
});

describe("updateClientSchema", () => {
  it("acepta pausar y quitar la fecha de pago", () => {
    expect(updateClientSchema.safeParse({ status: "PAUSED" }).success).toBe(true);
    expect(updateClientSchema.safeParse({ paid_until: null }).success).toBe(true);
  });

  it("no deja volver a INVITED ni mandar un cambio vacío", () => {
    expect(updateClientSchema.safeParse({ status: "INVITED" }).success).toBe(false);
    expect(updateClientSchema.safeParse({}).success).toBe(false);
  });
});

describe("trainerPricesSchema", () => {
  it("acepta una sola periodicidad y deja las demás sin ofrecer", () => {
    expect(trainerPricesSchema.safeParse({ currency: "dkk", prices: { MONTH: 45000, YEAR: null } }).success).toBe(true);
  });

  it("rechaza sin precios, importes bajo el mínimo o con decimales y monedas fuera del selector", () => {
    expect(trainerPricesSchema.safeParse({ currency: "eur", prices: {} }).success).toBe(false);
    expect(trainerPricesSchema.safeParse({ currency: "eur", prices: { MONTH: null } }).success).toBe(false);
    expect(trainerPricesSchema.safeParse({ currency: "eur", prices: { MONTH: 299 } }).success).toBe(false);
    expect(trainerPricesSchema.safeParse({ currency: "eur", prices: { MONTH: 3000.5 } }).success).toBe(false);
    expect(trainerPricesSchema.safeParse({ currency: "jpy", prices: { MONTH: 3000 } }).success).toBe(false);
    expect(trainerPricesSchema.safeParse({ currency: "EUR", prices: { MONTH: 3000 } }).success).toBe(false);
  });
});
