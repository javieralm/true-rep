import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ db: { user: { update: vi.fn() } } }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));

import { POST } from "@/app/api/trainer-application/route";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const req = (body: unknown) =>
  new Request("http://localhost/api/trainer-application", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/trainer-application", () => {
  beforeEach(() => {
    vi.mocked(db.user.update).mockReset();
    vi.mocked(requireUser).mockReset();
  });

  it("registra la solicitud sin tocar el rol: solo un superadmin hace a alguien entrenador", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "u1", role: "USER", trainer_requested_at: null } as never);

    const res = await POST(req({ note: "  Entreno a 12 personas  ", role: "TRAINER", is_superadmin: true }));

    expect(res.status).toBe(201);
    const { data } = vi.mocked(db.user.update).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(Object.keys(data).sort()).toEqual(["trainer_application_note", "trainer_requested_at"]);
    expect(data.trainer_application_note).toBe("Entreno a 12 personas");
  });

  it("un entrenador no puede volver a solicitarlo", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "u1", role: "TRAINER" } as never);
    const res = await POST(req({}));
    expect(res.status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rechaza notas demasiado largas", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "u1", role: "USER", trainer_requested_at: null } as never);
    const res = await POST(req({ note: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });
});
