import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    routine: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireTrainer: vi.fn(),
}));

import { GET } from "@/app/api/routines/route";
import { db } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";

describe("GET /api/routines", () => {
  beforeEach(() => {
    vi.mocked(db.routine.findMany).mockClear();
    vi.mocked(requireTrainer).mockReset();
  });

  it("returns 200 with the routine list for valid (default) pagination", async () => {
    const res = await GET(new Request("http://localhost/api/routines"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("success");
  });

  it("returns 400 (not 500) for an invalid limit value", async () => {
    const res = await GET(new Request("http://localhost/api/routines?limit=abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid difficulty filter", async () => {
    const res = await GET(new Request("http://localhost/api/routines?difficulty=GODMODE"));
    expect(res.status).toBe(400);
  });

  it("?mine=true scopes results to the requesting trainer, not all trainers' drafts", async () => {
    vi.mocked(requireTrainer).mockResolvedValue({ id: "trainer-1" } as never);
    await GET(new Request("http://localhost/api/routines?mine=true"));
    expect(db.routine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ trainer_id: "trainer-1" }),
      })
    );
    const call = vi.mocked(db.routine.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where).not.toHaveProperty("is_published");
  });

  it("?mine=true rejects (403) when the caller isn't a trainer, without querying routines", async () => {
    vi.mocked(requireTrainer).mockRejectedValue(new Response(null, { status: 403 }));
    const res = await GET(new Request("http://localhost/api/routines?mine=true"));
    expect(res.status).toBe(403);
    expect(db.routine.findMany).not.toHaveBeenCalled();
  });

  it("without ?mine=true, only published routines are requested (no trainer check)", async () => {
    await GET(new Request("http://localhost/api/routines"));
    expect(requireTrainer).not.toHaveBeenCalled();
    const call = vi.mocked(db.routine.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where).toMatchObject({ is_published: true });
  });
});
