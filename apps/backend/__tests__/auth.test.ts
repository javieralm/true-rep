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
      upsert: vi.fn(),
    },
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  requireActiveSubscription,
  requireUser,
  requireTrainer,
  requireSuperadmin,
  requirePremium,
  getOrSyncUser,
} from "@/lib/auth";

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

describe("requireUser", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
  });

  it("rejects with 401 when there is no Clerk session", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(requireUser()).rejects.toBeInstanceOf(Response);
  });

  it("resolves the synced user when a session exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(baseUser as never);
    await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
  });
});

describe("requireTrainer", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
  });

  it("rejects with 403 when the user is not a trainer", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...baseUser, role: "USER" } as never);
    await expect(requireTrainer()).rejects.toBeInstanceOf(Response);
  });

  it("resolves when the user is a trainer", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...baseUser, role: "TRAINER" } as never);
    await expect(requireTrainer()).resolves.toMatchObject({ role: "TRAINER" });
  });
});

describe("requireSuperadmin", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
  });

  it("rejects with 403 when the user is not a superadmin", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...baseUser, is_superadmin: false } as never);
    await expect(requireSuperadmin()).rejects.toBeInstanceOf(Response);
  });

  it("resolves when the user is a superadmin", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...baseUser, is_superadmin: true } as never);
    await expect(requireSuperadmin()).resolves.toMatchObject({ is_superadmin: true });
  });
});

describe("requirePremium", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
  });

  it("rejects a BASE plan even with an active subscription", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "ACTIVE",
      subscription_expires_at: null,
      subscription_plan: "BASE",
    } as never);
    await expect(requirePremium()).rejects.toBeInstanceOf(Response);
  });

  it("rejects an inactive subscription before even checking the plan", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "FREE",
      subscription_plan: "PREMIUM",
    } as never);
    await expect(requirePremium()).rejects.toBeInstanceOf(Response);
  });

  it("resolves for an active PREMIUM subscription", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...baseUser,
      subscription_status: "ACTIVE",
      subscription_expires_at: null,
      subscription_plan: "PREMIUM",
    } as never);
    await expect(requirePremium()).resolves.toMatchObject({ subscription_plan: "PREMIUM" });
  });
});

describe("getOrSyncUser", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(db.user.upsert).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
    vi.mocked(currentUser).mockReset().mockResolvedValue(null);
  });

  it("returns null when there is no Clerk session", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    await expect(getOrSyncUser()).resolves.toBeNull();
  });

  it("short-circuits without calling currentUser/upsert when the user already exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(baseUser as never);
    await expect(getOrSyncUser()).resolves.toMatchObject({ id: "u1" });
    expect(currentUser).not.toHaveBeenCalled();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("returns null when the Clerk user has no email address", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue({ emailAddresses: [], username: "x" } as never);
    await expect(getOrSyncUser()).resolves.toBeNull();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("upserts a new user from Clerk data on first sync", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue({
      emailAddresses: [{ emailAddress: "new@user.com" }],
      username: "newbie",
      firstName: "New",
      imageUrl: "https://img",
    } as never);
    vi.mocked(db.user.upsert).mockResolvedValue({ ...baseUser, id: "u2", email: "new@user.com" } as never);

    await expect(getOrSyncUser()).resolves.toMatchObject({ id: "u2" });
    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerk_id: "clerk_1" },
        create: expect.objectContaining({ clerk_id: "clerk_1", email: "new@user.com", username: "newbie" }),
      })
    );
  });
});
