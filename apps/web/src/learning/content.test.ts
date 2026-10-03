import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lessons, scenarios } from "./content";
import type { Text } from "./content";

function complete(value: Text) {
  expect(value.ko.trim()).not.toBe("");
  expect(value.en.trim()).not.toBe("");
}

describe("bilingual learning content", () => {
  it("covers the six-step path and four distinct fault controls", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual([
      "request", "database", "cache", "async", "outbox", "diagnose",
    ]);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "DOWNSTREAM_LATENCY", "DATABASE_DEGRADATION", "KAFKA_SLOWDOWN", "CACHE_DEGRADATION",
    ]);
  });

  it("has no blank Korean or English lesson, flow explanation or broken code path", () => {
    for (const lesson of lessons) {
      for (const value of [lesson.title, lesson.goal, lesson.situation, lesson.question, lesson.answer, lesson.hint]) complete(value);
      for (const topic of lesson.topics) {
        complete(topic.name);
        expect(topic.sections).toHaveLength(7);
        topic.sections.forEach(complete);
        expect(existsSync(path.resolve(process.cwd(), "../..", topic.code)), topic.code).toBe(true);
      }
    }
    for (const scenario of scenarios) {
      for (const value of [scenario.title, scenario.change, scenario.observe, scenario.question, scenario.expected]) complete(value);
    }
  });
});
