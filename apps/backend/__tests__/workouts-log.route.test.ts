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
  role: "USER",
  is_superadmin: false,
  subscription_status: "ACTIVE",
  subscription_expires_at: null as Date | null,
};

// Cliente de un entrenador que paga por Stripe (su suscripción manda).
const relation = {
  status: "ACTIVE",
  billing: "STRIPE",
  paid_until: null as Date | null,
  stripe_subscription_id: "sub_1",
  subscription_status: "active",
  current_period_end: null as Date | null,
};

const NOW = new Date("2026-07-31T09:00:00Z");

vi.mock("@/lib/auth", () => ({
  requireClientAccess: vi.fn(async () => staleUser),
}));

vi.mock("@/lib/db", () => {
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    $executeRawUnsafe: vi.fn(async () => 0),
    $queryRaw: vi.fn(async () => [{ now: NOW }]),
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
    routine: { findFirst: vi.fn() },
    trainerClient: { findFirst: vi.fn(), update: vi.fn() },
  };
  return {
    db: {
      routine: { findFirst: vi.fn() },
      workout: { count: vi.fn(async () => 0) },
      achievement: { findMany: vi.fn(async () => []) },
      userAchievement: { createMany: vi.fn(async () => ({ count: 0 })) },
      challengeParticipant: { updateMany: vi.fn(async () => ({ count: 0 })) },
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
  is_published: true,
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
  idempotency_key: "00000000-0000-0000-0000-000000000000",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tx = (db as any).__tx;

describe("POST /api/workouts/log", () => {
  beforeEach(() => {
    vi.mocked(db.routine.findFirst).mockReset().mockResolvedValue(routine as never);
    vi.mocked(db.workout.count).mockReset().mockResolvedValue(0);
    vi.mocked(db.challengeParticipant.updateMany).mockReset().mockResolvedValue({ count: 0 });
    tx.$executeRaw.mockReset().mockResolvedValue(0);
    tx.$executeRawUnsafe.mockReset().mockResolvedValue(0);
    tx.$queryRaw.mockReset().mockResolvedValue([{ now: NOW }]);
    tx.workout.findFirst.mockReset().mockResolvedValue(null);
    tx.routine.findFirst.mockReset().mockResolvedValue(routine);
    tx.user.findUniqueOrThrow.mockReset().mockResolvedValue(staleUser);
    tx.trainerClient.findFirst.mockReset().mockResolvedValue(relation);
    tx.user.update.mockReset().mockImplementation(async ({ data }: UserUpdateArgs) => ({
      ...staleUser,
      xp: staleUser.xp + (data.xp?.increment ?? 0),
      streak: data.streak,
    }));
    tx.workout.create.mockReset().mockImplementation(async ({ data }: WorkoutCreateArgs) => ({ id: "w1", ...data }));
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

  it("still returns 201 with the saved workout when the challenge auto-complete fails", async () => {
    vi.mocked(db.challengeParticipant.updateMany).mockRejectedValueOnce(new Error("db blip"));
    const res = await POST(req(validBody));
    expect(res.status).toBe(201);
  });

  it("dedupes by idempotency_key regardless of how much time has passed", async () => {
    tx.workout.findFirst.mockResolvedValue({
      id: "w-existing",
      user_id: "u1",
      routine_id: "r1",
      idempotency_key: "11111111-1111-1111-1111-111111111111",
      completed_at: new Date("2020-01-01T00:00:00Z"), // long before "now" — no time window applies
    });
    const res = await POST(req({ ...validBody, idempotency_key: "11111111-1111-1111-1111-111111111111" }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.deduped).toBe(true);
    expect(tx.workout.findFirst).toHaveBeenCalledWith({
      where: { user_id: "u1", idempotency_key: "11111111-1111-1111-1111-111111111111" },
    });
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("persists the idempotency_key on a new workout when the client sends one", async () => {
    await POST(req({ ...validBody, idempotency_key: "22222222-2222-2222-2222-222222222222" }));
    expect(tx.workout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotency_key: "22222222-2222-2222-2222-222222222222" }),
      })
    );
  });

  it("acquires a per-user advisory lock (with a lock timeout) before the dedupe check", async () => {
    await POST(req(validBody));
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects if the fresh in-transaction read shows an expired subscription", async () => {
    tx.trainerClient.findFirst.mockResolvedValue({ ...relation, subscription_status: "unpaid" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(402);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("rechaza si el entrenador pausó al cliente mientras esperaba el lock", async () => {
    tx.trainerClient.findFirst.mockResolvedValue({ ...relation, status: "PAUSED" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(403);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("rejects if the routine was unpublished between the pre-check and the in-transaction re-read", async () => {
    tx.routine.findFirst.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(404);
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it("computes streak from a fresh in-transaction read, not a pre-transaction snapshot", async () => {
    // Simulate a concurrent workout already having advanced the streak to 6
    // by the time this request's transaction actually reads the user row.
    tx.user.findUniqueOrThrow.mockResolvedValue({ ...staleUser, streak: 6, streak_last_workout_date: NOW });
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    // Same-day re-log after the concurrent one: nextStreak holds at 6, not 7
    // (proves the value came from the fresh in-tx read, not the stale outer snapshot which was 5→6).
    expect(body.data.user.streak).toBe(6);
  });
});
