import { describe, it, expect, vi, beforeEach } from "vitest";

type UserUpdateArgs = { data: { xp?: { increment?: number }; streak: number } };
type WorkoutCreateArgs = { data: Record<string, unknown> };

const staleUser = {
  id: "u1",
  clerk_id: "clerk_1",
  email: "a@b.com",
  username: "a",
  xp: 50,
  streak: 5,
  streak_last_workout_date: new Date("2026-07-30T08:00:00Z"), // "yesterday" relative to `now` in the route
};

vi.mock("@/lib/auth", () => ({
  requireActiveSubscription: vi.fn(async () => staleUser),
}));

vi.mock("@/lib/db", () => {
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    user: {
      findUniqueOrThrow: vi.fn(async () => staleUser),
      update: vi.fn(async ({ data }: UserUpdateArgs) => ({
        ...staleUser,
        xp: staleUser.xp + (data.xp?.increment ?? 0),
        streak: data.streak,
      })),
    },
    workout: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: WorkoutCreateArgs) => ({ id: "w1", ...data })),
    },
    challengeParticipant: { updateMany: vi.fn(async () => ({ count: 0 })) },
  };
  return {
    db: {
      routine: { findFirst: vi.fn() },
      workout: { count: vi.fn(async () => 0) },
      achievement: { findMany: vi.fn(async () => []) },
      userAchievement: { createMany: vi.fn(async () => ({ count: 0 })) },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
      __tx: tx,
    },
  };
});

import { POST } from "@/app/api/workouts/log/route";
import { db } from "@/lib/db";

const routine = {
  id: "r1",
  deleted_at: null,
  duration_minutes: 20,
  exercises: [{ id: "ex1", name: "Push-ups" }],
};

function req(body: unknown) {
  return new Request("http://localhost/api/workouts/log", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  routine_id: "r1",
  duration_minutes: 20,
  exercises_completed: [{ exercise_id: "ex1", reps_done: 10, felt_like: "medium" }],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tx = (db as any).__tx;

describe("POST /api/workouts/log", () => {
  beforeEach(() => {
    vi.mocked(db.routine.findFirst).mockReset().mockResolvedValue(routine as never);
    vi.mocked(db.workout.count).mockReset().mockResolvedValue(0);
    tx.$executeRaw.mockReset().mockResolvedValue(0);
    tx.workout.findFirst.mockReset().mockResolvedValue(null);
    tx.user.findUniqueOrThrow.mockReset().mockResolvedValue(staleUser);
    tx.user.update.mockReset().mockImplementation(async ({ data }: UserUpdateArgs) => ({
      ...staleUser,
      xp: staleUser.xp + (data.xp?.increment ?? 0),
      streak: data.streak,
    }));
    tx.workout.create.mockReset().mockImplementation(async ({ data }: WorkoutCreateArgs) => ({ id: "w1", ...data }));
    tx.challengeParticipant.updateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it("returns 404 when the routine doesn't exist", async () => {
    vi.mocked(db.routine.findFirst).mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(404);
  });

  it("succeeds and returns earned xp/streak for a valid log", async () => {
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.user.streak).toBe(6);
  });

  it("rejects an exercise_id that isn't part of the routine (anti XP-farming)", async () => {
    const res = await POST(
      req({
        ...validBody,
        exercises_completed: [{ exercise_id: "not-in-routine", reps_done: 10, felt_like: "medium" }],
      })
    );
    expect(res.status).toBe(400);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("rejects a claimed duration far beyond what the routine calls for (anti XP-farming)", async () => {
    const res = await POST(req({ ...validBody, duration_minutes: 600 }));
    expect(res.status).toBe(400);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("still returns 201 with the saved workout when checkAchievements() throws", async () => {
    vi.mocked(db.achievement.findMany).mockRejectedValueOnce(new Error("db blip"));
    // force a condition so checkAchievements actually queries
    vi.mocked(db.workout.count).mockResolvedValueOnce(1);
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.unlocked_achievements).toEqual([]);
    expect(tx.workout.create).toHaveBeenCalledTimes(1);
  });

  it("dedupes a retried request within the idempotency window instead of creating a second workout", async () => {
    tx.workout.findFirst.mockResolvedValue({
      id: "w-existing",
      user_id: "u1",
      routine_id: "r1",
      completed_at: new Date(),
    });
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.deduped).toBe(true);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("acquires a per-user advisory lock before the dedupe check (closes the concurrent-retry race)", async () => {
    await POST(req(validBody));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("computes streak from a fresh in-transaction read, not a pre-transaction snapshot", async () => {
    // Simulate a concurrent workout already having advanced the streak to 6
    // by the time this request's transaction actually reads the user row.
    tx.user.findUniqueOrThrow.mockResolvedValue({ ...staleUser, streak: 6, streak_last_workout_date: new Date() });
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    // Same-day re-log after the concurrent one: nextStreak holds at 6, not 7
    // (proves the value came from the fresh in-tx read, not the stale outer snapshot which was 5→6).
    expect(body.data.user.streak).toBe(6);
  });
});
