import { describe, it, expect } from "vitest";
import { computeWeightSuggestions } from "../src/lib/progression";
import { csvEscape, toCsvRow } from "../src/lib/csv";

describe("computeWeightSuggestions", () => {
  it("suggests +1kg when the most recent set felt easy", () => {
    const suggestions = computeWeightSuggestions(
      [
        {
          completed_at: new Date("2026-09-01"),
          exercises_completed: [{ exercise_id: "pull-up", reps_done: 8, weight_kg: 20, felt_like: "easy" }],
        },
      ],
      ["pull-up"]
    );
    expect(suggestions).toEqual([
      { exercise_id: "pull-up", last_weight_kg: 20, last_felt_like: "easy", suggested_weight_kg: 21 },
    ]);
  });

  it("does not suggest anything when the most recent set felt hard or medium", () => {
    const suggestions = computeWeightSuggestions(
      [
        {
          completed_at: new Date("2026-09-01"),
          exercises_completed: [{ exercise_id: "pull-up", reps_done: 8, weight_kg: 20, felt_like: "hard" }],
        },
      ],
      ["pull-up"]
    );
    expect(suggestions).toEqual([]);
  });

  it("uses only the most recent entry per exercise, ignoring order", () => {
    const suggestions = computeWeightSuggestions(
      [
        {
          completed_at: new Date("2026-09-08"),
          exercises_completed: [{ exercise_id: "pull-up", reps_done: 8, weight_kg: 22, felt_like: "hard" }],
        },
        {
          completed_at: new Date("2026-09-01"),
          exercises_completed: [{ exercise_id: "pull-up", reps_done: 8, weight_kg: 20, felt_like: "easy" }],
        },
      ],
      ["pull-up"]
    );
    expect(suggestions).toEqual([]);
  });

  it("ignores exercises without a logged weight", () => {
    const suggestions = computeWeightSuggestions(
      [
        {
          completed_at: new Date("2026-09-01"),
          exercises_completed: [{ exercise_id: "push-up", reps_done: 15, felt_like: "easy" }],
        },
      ],
      ["push-up"]
    );
    expect(suggestions).toEqual([]);
  });

  it("ignores exercises not in the requested routine", () => {
    const suggestions = computeWeightSuggestions(
      [
        {
          completed_at: new Date("2026-09-01"),
          exercises_completed: [{ exercise_id: "dip", reps_done: 8, weight_kg: 10, felt_like: "easy" }],
        },
      ],
      ["pull-up"]
    );
    expect(suggestions).toEqual([]);
  });
});

describe("csv", () => {
  it("leaves plain values untouched", () => {
    expect(csvEscape("push-up")).toBe("push-up");
  });

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    expect(csvEscape("Buen trabajo, sigue así")).toBe('"Buen trabajo, sigue así"');
    expect(csvEscape('el "mejor" día')).toBe('"el ""mejor"" día"');
    expect(csvEscape("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
  });

  it("joins a row of mixed values with escaping applied per cell", () => {
    expect(toCsvRow(["2026-09-01", "Pull-ups", 8, 20, "fácil, controlado"])).toBe(
      '2026-09-01,Pull-ups,8,20,"fácil, controlado"'
    );
  });
});
