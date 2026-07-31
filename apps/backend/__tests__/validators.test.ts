import { describe, it, expect } from "vitest";
import {
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
  it("accepts a valid workout log", () => {
    expect(() =>
      logWorkoutSchema.parse({
        routine_id: "r1",
        duration_minutes: 42,
        exercises_completed: [{ exercise_id: "e1", reps_done: 12, felt_like: "hard" }],
      })
    ).not.toThrow();
  });
  it("rejects invalid felt_like", () => {
    expect(() =>
      logWorkoutSchema.parse({
        routine_id: "r1",
        duration_minutes: 42,
        exercises_completed: [{ exercise_id: "e1", reps_done: 12, felt_like: "brutal" }],
      })
    ).toThrow();
  });
});

describe("logWorkoutSchema weight_kg", () => {
  it("accepts optional weight and rejects negatives", () => {
    const log = (weight_kg?: number) => ({
      routine_id: "r1",
      duration_minutes: 30,
      exercises_completed: [{ exercise_id: "e1", reps_done: 8, weight_kg, felt_like: "medium" }],
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
