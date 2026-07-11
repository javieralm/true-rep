import { describe, it, expect } from "vitest";
import { createRoutineSchema, logWorkoutSchema, createChallengeSchema } from "@truerep/shared";
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
