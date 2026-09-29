import { describe, it, expect, vi, beforeEach } from "vitest";

const afterCallbacks: Array<() => unknown> = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((cb: () => unknown) => {
      afterCallbacks.push(cb);
    }),
  };
});

vi.mock("@/lib/auth", () => ({
  requireTrainer: vi.fn(async () => ({ id: "trainer-1" })),
}));

vi.mock("@/lib/db", () => ({
  db: {
    videoFeedback: {
      findFirst: vi.fn(),
      update: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/video-feedback", () => ({
  runVideoAnalysis: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/video-feedback/[id]/review/route";
import { db } from "@/lib/db";
import { runVideoAnalysis } from "@/lib/video-feedback";
import { requireTrainer } from "@/lib/auth";

const feedback = {
  id: "f1",
  user_id: "u1",
  exercise_name: "Push-ups",
  video_url: "https://res.cloudinary.com/x/video/upload/v1/f1.mp4",
  analysis_status: "PENDING_TRAINER_REVIEW",
};

function req() {
  return new Request("http://localhost/api/video-feedback/f1/review", { method: "POST" });
}

const params = { params: Promise.resolve({ id: "f1" }) };

describe("POST /api/video-feedback/[id]/review", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    vi.mocked(db.videoFeedback.findFirst).mockReset();
    vi.mocked(db.videoFeedback.update).mockReset().mockResolvedValue({} as never);
    vi.mocked(runVideoAnalysis).mockClear();
    vi.mocked(requireTrainer).mockClear();
  });

  it("returns 404 when the feedback doesn't exist", async () => {
    vi.mocked(db.videoFeedback.findFirst).mockResolvedValue(null);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
  });

  it("returns 409 when the feedback isn't pending review", async () => {
    vi.mocked(db.videoFeedback.findFirst).mockResolvedValue({
      ...feedback,
      analysis_status: "COMPLETED",
    } as never);
    const res = await POST(req(), params);
    expect(res.status).toBe(409);
    expect(db.videoFeedback.update).not.toHaveBeenCalled();
  });

  it("requires a trainer session", async () => {
    vi.mocked(requireTrainer).mockRejectedValueOnce(new Response(null, { status: 403 }));
    const res = await POST(req(), params);
    expect(res.status).toBe(403);
  });

  it("moves status to PENDING and schedules the analysis on approval", async () => {
    vi.mocked(db.videoFeedback.findFirst).mockResolvedValue(feedback as never);
    const res = await POST(req(), params);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe("pending");
    expect(db.videoFeedback.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { analysis_status: "PENDING" },
    });
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(runVideoAnalysis).toHaveBeenCalledWith("f1", feedback.video_url, feedback.exercise_name);
  });

  it("solo busca vídeos de clientes del propio entrenador", async () => {
    vi.mocked(db.videoFeedback.findFirst).mockResolvedValue(null);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
    expect(db.videoFeedback.findFirst).toHaveBeenCalledWith({
      where: {
        id: "f1",
        user: { client_of: { some: { trainer_id: "trainer-1", status: { in: ["ACTIVE", "PAUSED"] } } } },
      },
    });
    expect(runVideoAnalysis).not.toHaveBeenCalled();
  });
});
