import { describe, it, expect } from "vitest";
import { withLibraryDefaults } from "@/lib/routine-exercises";

describe("withLibraryDefaults", () => {
  const library = [{ id: "lib1", measure: "seconds" as const, video_url: "https://v/lsit" }];

  it("lleva a la rutina lo que se marcó después en la librería", () => {
    const [ex] = withLibraryDefaults([{ id: "e1", exercise_id: "lib1", name: "L-sit" }], library);
    expect(ex).toMatchObject({ measure: "seconds", technique_video_url: "https://v/lsit" });
  });

  it("lo que ya dice la rutina manda, y sin enlace a la librería no se toca", () => {
    const own = { id: "e1", exercise_id: "lib1", name: "L-sit", technique_video_url: "https://v/propio" };
    expect(withLibraryDefaults([own], library)[0].technique_video_url).toBe("https://v/propio");
    const loose = { id: "e2", name: "Libre" };
    expect(withLibraryDefaults([loose], library)[0]).toEqual(loose);
  });
});
