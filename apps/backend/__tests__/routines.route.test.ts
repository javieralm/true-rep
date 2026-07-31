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

describe("GET /api/routines", () => {
  beforeEach(() => {
    vi.mocked(db.routine.findMany).mockClear();
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
});
