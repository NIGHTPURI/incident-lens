import { describe, expect, it } from "vitest";
import { roadmap } from "./curriculum";
import { coursePhases } from "./language-course";
import { courseChapters } from "./language-course-data";
import { codeLanguages, guideSections, readCodeLanguage } from "./programming-tracks";
import { technologyGuides, technologyGroups, technologySections } from "./technology-guides";

describe("approved learning catalog", () => {
  it("covers each user-facing lab component and links guides to real Java stages", () => {
    expect(technologyGuides.map(guide => guide.id).sort()).toEqual([
      "docker", "grafana", "java-spring", "k6", "kafka", "loki", "mysql",
      "otel", "prometheus", "rca", "react-vite", "redis", "services", "tempo",
    ].sort());
    expect(new Set(technologyGuides.map(guide => guide.id)).size).toBe(technologyGuides.length);
    expect(new Set(technologySections.map(section => section.id)).size).toBe(technologySections.length);
    const stages = new Set(roadmap.map(stage => stage.id));
    for (const guide of technologyGuides) {
      expect(technologyGroups.some(group => group.id === guide.group)).toBe(true);
      expect(guide.stage && stages.has(guide.stage)).toBe(true);
      expect(new URL(guide.source).protocol).toBe("https:");
      expect(guide.example.trim()).not.toBe("");
      for (const field of [guide.problem, guide.oldWay, guide.purpose, guide.boundary, guide.flow, guide.exampleNote, guide.inLab, guide.observe, guide.diagnose, guide.alternatives, guide.guided, guide.independent]) {
        expect(field.ko.trim()).not.toBe("");
        expect(field.en.trim()).not.toBe("");
      }
    }
    expect(technologyGuides.find(guide => guide.id === "prometheus")?.mode).toBe("optional");
    expect(technologyGuides.find(guide => guide.id === "grafana")?.boundary.en).toContain("does not collect or store");
    expect(technologyGuides.find(guide => guide.id === "kafka")?.boundary.en).toContain("exactly-once");
    expect(technologyGuides.find(guide => guide.id === "redis")?.boundary.en).toContain("MySQL");
  });

  it("keeps Java progress separate from four five-step language courses", () => {
    expect(codeLanguages.map(item => item.id)).toEqual(["java", "python", "javascript", "go", "csharp"]);
    expect(readCodeLanguage({ getItem: () => "invalid" })).toBe("java");
    expect(readCodeLanguage({ getItem: () => { throw Error("blocked"); } })).toBe("java");
    expect(coursePhases.map(phase => phase.id)).toEqual(["api", "db", "auth", "tests", "deployment"]);
    expect(guideSections.map(section => section.id)).toEqual(["orient", "setup", "basics", "api", "db", "auth", "tests", "deployment", "frameworks", "shared"]);
    for (const language of ["python", "javascript", "go", "csharp"] as const) {
      expect(Object.keys(courseChapters[language])).toEqual(coursePhases.map(phase => phase.id));
      for (const phase of coursePhases) {
        const chapter = courseChapters[language][phase.id];
        expect(chapter.code.trim()).not.toBe("");
        expect(new URL(chapter.source).protocol).toBe("https:");
        for (const field of [chapter.intro, chapter.flow, chapter.codeScope, chapter.failure, chapter.guided, chapter.independent]) {
          expect(field.ko.trim()).not.toBe("");
          expect(field.en.trim()).not.toBe("");
        }
      }
    }
  });
});
