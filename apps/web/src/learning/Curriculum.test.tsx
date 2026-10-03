import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Curriculum from "./Curriculum";
import { chapters, roadmap } from "./curriculum";
import { progressKey, readProgress } from "./progress";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../i18n/I18nProvider";

afterEach(() => localStorage.clear());
function mount() {
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  const context = vi.fn();
  render(<I18nProvider><Curriculum view="lesson" onViewChange={vi.fn()} onContextChange={context} onReference={vi.fn()} /></I18nProvider>);
  return context;
}
describe("beginner curriculum", () => {
  it("publishes all fifteen authored stages with complete bilingual instructional sections", () => {
    expect(roadmap).toHaveLength(15);
    expect(chapters).toHaveLength(15);
    expect(roadmap.every(stage => stage.status === "available")).toBe(true);
    expect(new Set(roadmap.map(stage => stage.id)).size).toBe(15);
    expect(roadmap.filter(stage => stage.status === "available").map(stage => stage.id)).toEqual(chapters.map(chapter => chapter.id));
    for (const chapter of chapters) {
      for (const field of [chapter.title, chapter.summary, chapter.prerequisites, chapter.glossary, chapter.prediction, chapter.answer, chapter.guided, chapter.failure, chapter.exercise, chapter.hint, chapter.solution, chapter.criteria, chapter.tradeoffs]) {
        expect(field.ko.trim()).not.toBe(""); expect(field.en.trim()).not.toBe("");
      }
      expect(chapter.concepts.length).toBeGreaterThanOrEqual(3);
      expect(chapter.flow.length).toBeGreaterThanOrEqual(3);
      if (chapter.exampleFiles) {
        expect(chapter.scope?.ko).toBeTruthy(); expect(chapter.scope?.en).toBeTruthy();
      }
      for (const field of [...chapter.concepts, ...chapter.flow]) {
        expect(field.title.ko).toBeTruthy(); expect(field.title.en).toBeTruthy();
        expect(field.body.ko).toBeTruthy(); expect(field.body.en).toBeTruthy();
      }
    }
  });
  it("maps legacy lesson IDs without destroying distinct predictions", () => {
    localStorage.setItem("incidentlens.learning.lesson", "outbox");
    localStorage.setItem("incidentlens.learning.prediction.outbox", "my old answer");
    expect(readProgress(localStorage).stage).toBe("messaging");
    expect(localStorage.getItem("incidentlens.learning.prediction.outbox")).toBe("my old answer");
    expect(localStorage.getItem("incidentlens.learning.lesson")).toBe("outbox");
  });
  it("recovers corrupt and unknown IDs without depending on positions", () => {
    localStorage.setItem(progressKey, "{"); expect(readProgress(localStorage).stage).toBe("tools");
    localStorage.setItem(progressKey, JSON.stringify({ version: 1, stage: "unknown", read: ["java", "unknown"], notes: { java: "kept", unknown: "discard" } }));
    expect(readProgress(localStorage)).toMatchObject({ stage: "tools", read: ["java"], notes: { java: "kept" } });
  });
  it("supports keyboard tabs and separates read state from practice evidence", () => {
    const context = mount();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Concept" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Minimal example" })).toHaveFocus();
    fireEvent.click(screen.getByRole("tab", { name: "Independent practice" }));
    fireEvent.change(screen.getByLabelText("My execution and verification record"), { target: { value: "I tested the path and recorded output" } });
    fireEvent.click(screen.getByRole("button", { name: "Next lesson" }));
    expect(readProgress(localStorage).read).toEqual([]);
    expect(readProgress(localStorage).evidence.tools).toContain("recorded output");
    expect(readProgress(localStorage).stage).toBe("java");
    expect(context).toHaveBeenCalled();
  });
  it("keeps advanced simulation limits visible on every tab without awarding mastery", () => {
    localStorage.setItem(progressKey, JSON.stringify({ version: 1, stage: "messaging" }));
    mount();
    expect(screen.getByTestId("chapter-scope")).toHaveTextContent("no Kafka cluster");
    fireEvent.click(screen.getByRole("tab", { name: "Independent practice" }));
    expect(screen.getByTestId("chapter-scope")).toHaveTextContent("real H2 transactions");
    expect(screen.getByLabelText("My execution and verification record")).toHaveValue("");
    expect(readProgress(localStorage).read).toEqual([]);
  });
});
