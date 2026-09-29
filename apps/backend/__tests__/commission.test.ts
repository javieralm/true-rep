import { describe, it, expect } from "vitest";
import { currentCommission } from "@/lib/commission";

describe("currentCommission", () => {
  it("tramos por defecto: 10 % hasta 10 clientes, 8 % hasta 30, 6 % a partir de 31", () => {
    expect(currentCommission(0, null)).toBe(10);
    expect(currentCommission(10, null)).toBe(10);
    expect(currentCommission(11, null)).toBe(8);
    expect(currentCommission(30, null)).toBe(8);
    expect(currentCommission(31, null)).toBe(6);
    expect(currentCommission(500, null)).toBe(6);
  });

  it("el porcentaje propio del entrenador manda sobre los tramos, también si es 0", () => {
    expect(currentCommission(3, 4.5)).toBe(4.5);
    expect(currentCommission(3, 0)).toBe(0);
  });
});
