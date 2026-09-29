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
    trainerClient: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/trainer-billing", () => ({ syncTrainerBillingLater: vi.fn() }));

import { auth, currentUser } from "@clerk/nextjs/server";
import { syncTrainerBillingLater } from "@/lib/trainer-billing";
import { db } from "@/lib/db";
import {
  requireClientAccess,
  requireUser,
  requireTrainer,
  requireSuperadmin,
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

describe("requireClientAccess", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset();
    vi.mocked(db.trainerClient.findFirst).mockReset();
    vi.mocked(db.trainerClient.update).mockReset();
    vi.mocked(auth).mockReset().mockResolvedValue({ userId: "clerk_1" } as never);
  });

  it("deja pasar a un entrenador sin mirar relaciones", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ ...baseUser, role: "TRAINER" } as never);
    await expect(requireClientAccess()).resolves.toMatchObject({ role: "TRAINER" });
    expect(db.trainerClient.findFirst).not.toHaveBeenCalled();
  });

  it("rechaza a quien no tiene entrenador ni invitación", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(db.trainerClient.findFirst).mockResolvedValue(null);
    const err = await requireClientAccess().catch((e: Response) => e);
    expect((err as Response).status).toBe(403);
  });

  it("acepta la invitación pendiente de su email y le deja pasar", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(baseUser as never);
    const invite = { id: "tc1", trainer_id: "t1", status: "INVITED", billing: "CASH", paid_until: null, client_id: null };
    vi.mocked(db.trainerClient.findFirst)
      .mockResolvedValueOnce(null) // sin relación vinculada
      .mockResolvedValueOnce(invite as never); // invitación para a@b.com
    vi.mocked(db.trainerClient.update).mockResolvedValue({ ...invite, status: "ACTIVE", client_id: "u1" } as never);

    await expect(requireClientAccess()).resolves.toMatchObject({ id: "u1" });
    expect(db.trainerClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ client_id: "u1", status: "ACTIVE" }) })
    );
    // Un cliente activo más: se recalcula lo que paga su entrenador.
    expect(syncTrainerBillingLater).toHaveBeenCalledWith("t1");
  });

  it("402 cuando el pago en efectivo ha vencido", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(db.trainerClient.findFirst).mockResolvedValue({
      status: "ACTIVE",
      billing: "CASH",
      paid_until: new Date("2020-01-01T00:00:00Z"),
    } as never);
    const err = await requireClientAccess().catch((e: Response) => e);
    expect((err as Response).status).toBe(402);
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
      primaryEmailAddressId: "e1",
      emailAddresses: [{ id: "e1", emailAddress: "New@User.com", verification: { status: "verified" } }],
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

  it("no sincroniza con un email sin verificar: podría quedarse con la invitación de otro", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.upsert).mockClear();
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddressId: "e1",
      emailAddresses: [{ id: "e1", emailAddress: "victima@mail.com", verification: { status: "unverified" } }],
    } as never);

    await expect(getOrSyncUser()).resolves.toBeNull();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
});
