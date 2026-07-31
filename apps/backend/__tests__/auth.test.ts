import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk + db before importing the module under test.
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "clerk_1" })),
  currentUser: vi.fn(async () => null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/auth";

const baseUser = {
  id: "u1",
  clerk_id: "clerk_1",
  email: "a@b.com",
  username: "a",
  role: "USER",
  is_superadmin: false,
  subscription_plan: "BASE",
  streak: 0,
  streak_last_workout_date: null,
  xp: 0,
};

describe("requireActiveSubscription", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
  });

  it("rejects a FREE subscription", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "FREE",
      subscription_expires_at: null,
    } as never);

    await expect(requireActiveSubscription()).rejects.toBeInstanceOf(Response);
  });

  it("rejects an ACTIVE subscription whose expiry date has already passed", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "ACTIVE",
      subscription_expires_at: new Date("2020-01-01T00:00:00Z"),
    } as never);

    await expect(requireActiveSubscription()).rejects.toBeInstanceOf(Response);
  });

  it("allows an ACTIVE subscription with no expiry date set", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "ACTIVE",
      subscription_expires_at: null,
    } as never);

    await expect(requireActiveSubscription()).resolves.toMatchObject({ id: "u1" });
  });

  it("allows an ACTIVE subscription with a future expiry date", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "ACTIVE",
      subscription_expires_at: new Date("2099-01-01T00:00:00Z"),
    } as never);

    await expect(requireActiveSubscription()).resolves.toMatchObject({ id: "u1" });
  });
});
