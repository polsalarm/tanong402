import { describe, expect, it } from "vitest";
import { formatPhp, fromUnits, questionsLeft, shortAddress, toUnits } from "./money.js";

describe("money", () => {
  it("converts to and from 7-decimal units", () => {
    expect(toUnits("0.005")).toBe(50_000n);
    expect(toUnits("1")).toBe(10_000_000n);
    expect(toUnits("0.25")).toBe(2_500_000n);
    expect(fromUnits(50_000n)).toBe("0.005");
    expect(fromUnits(10_000_000n)).toBe("1");
    expect(fromUnits(0n)).toBe("0");
    expect(() => toUnits("0.00000001")).toThrow();
    expect(() => toUnits("abc")).toThrow();
  });

  it("counts questions left", () => {
    expect(questionsLeft("0.25", "0.005")).toBe(50);
    expect(questionsLeft("0.004", "0.005")).toBe(0);
    expect(questionsLeft("0.15", "0.005")).toBe(30);
    expect(questionsLeft("1", "0")).toBe(0);
  });

  it("formats pesos and addresses", () => {
    expect(formatPhp(0.29)).toContain("0.29");
    expect(shortAddress("GABCDEFGHIJKLMNOP")).toBe("GABC…MNOP");
  });
});
