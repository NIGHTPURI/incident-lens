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

  it("localizes missing data while preserving zero, units and comparison arithmetic", () => {
    expect(number(null, 0, "ko")).toBe("확인 불가");
    expect(percent(undefined, "ko")).toBe("확인 불가");
    expect(milliseconds(Number.NaN, "ko")).toBe("확인 불가");
    expect(date("invalid", "ko")).toBe("확인 불가");
    expect(number(1234, 0, "ko")).toBe("1,234");
    expect(percent(0, "ko")).toBe("0%");
    expect(milliseconds(125.45, "ko")).toBe("125.5 ms");
    expect(change(200, 100, "ko")).toBe("-50%");
    expect(change(null, 0, "ko")).toBe("—");
  });

  it("uses the chosen language for dates independently of browser language", () => {
    const instant = "2026-09-22T12:00:00Z";
    expect(date(instant, "ko")).toContain("9월");
    expect(date(instant, "en")).toContain("Sep");
  });
});
