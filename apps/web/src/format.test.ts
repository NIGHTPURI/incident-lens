import { describe, expect, it } from "vitest";
import { change, date, milliseconds, number, percent } from "./format";

describe("measurement presentation", () => {
  it("distinguishes missing telemetry from actual zero measurements", () => {
    expect(number(null)).toBe("Unavailable");
    expect(number(undefined)).toBe("Unavailable");
    expect(number(Number.NaN)).toBe("Unavailable");
    expect(number(0)).toBe("0");
    expect(percent(0)).toBe("0%");
    expect(milliseconds(null)).toBe("Unavailable");
  });

  it("formats rates as fractions and latency as milliseconds", () => {
    expect(percent(0.987)).toBe("98.7%");
    expect(milliseconds(125.45)).toBe("125.5 ms");
  });

  it("does not invent relative improvement from a zero or absent baseline", () => {
    expect(change(0, 5)).toBe("—");
    expect(change(null, 5)).toBe("—");
    expect(change(0, 0)).toBe("0%");
    expect(change(200, 100)).toBe("-50%");
    expect(change(100, 150)).toBe("+50%");
  });

  it("does not display misleading dates for missing values", () => {
    expect(date(null)).toBe("Unavailable");
    expect(date("not-a-date")).toBe("Unavailable");
  });
});
