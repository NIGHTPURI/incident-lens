import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../i18n/I18nProvider";
import Curriculum from "./Curriculum";
import KnowledgeCheck, { checks } from "./KnowledgeCheck";
import { chapters } from "./curriculum";
import { progressKey, readProgress } from "./progress";
import { splitLessonText } from "./LessonText";

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
function mount() {
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  render(<I18nProvider><Curriculum view="lesson" onViewChange={vi.fn()} onContextChange={vi.fn()} onReference={vi.fn()} /></I18nProvider>);
}
describe("learning interaction and readable text", () => {
  it("formats every authored paragraph without dropping text or splitting source code", () => {
    for (const chapter of chapters) {
      for (const body of [chapter.glossary, chapter.guided, chapter.failure, chapter.exercise, ...chapter.concepts.map(section => section.body)]) {
        for (const locale of ["ko", "en"] as const) expect(splitLessonText(body[locale]).join("")).toBe(body[locale]);
      }
    }
    expect(splitLessonText("Short text.")).toEqual(["Short text."]);
    expect(Object.keys(checks)).toEqual(chapters.map(chapter => chapter.id));
  });
  it("checks only the objective concept and keeps reading/mastery untouched", () => {
    mount();
    fireEvent.click(screen.getByRole("tab", { name: "Flow" }));
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "The file is deleted" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/Try again/)).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "The file remains" }));
    expect(screen.queryByText(/Try again/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText(/Correct. Review/)).toBeVisible();
    expect(readProgress(localStorage).read).toEqual([]);
    expect(readProgress(localStorage).reviewed).toEqual({});
    fireEvent.click(screen.getByRole("tab", { name: "Concept" }));
    fireEvent.click(screen.getByRole("tab", { name: "Flow" }));
    expect(screen.getByRole("radio", { name: "The file remains" })).toBeChecked();
    expect(screen.getByText(/Correct. Review/)).toBeVisible();
  });
  it("saves self-review only after a nonempty record and explicit comparison, invalidating it on edit", () => {
    mount(); fireEvent.click(screen.getByRole("tab", { name: "Independent practice" }));
    const save = screen.getByRole("button", { name: "Save self-review record" });
    const review = screen.getByRole("checkbox", { name: /I compared the pass criteria/ });
    expect(save).toBeDisabled();
    fireEvent.click(review); expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("My execution and verification record"), { target: { value: "Not executed; I compared the expected output." } });
    expect(review).not.toBeChecked(); expect(save).toBeDisabled();
    fireEvent.click(review); fireEvent.click(save);
    expect(screen.getByText(/Self-review record saved/)).toBeVisible();
    expect(readProgress(localStorage).reviewed.tools).toContain("Not executed");
    expect(readProgress(localStorage).read).toEqual([]);
    fireEvent.change(screen.getByLabelText("My execution and verification record"), { target: { value: "Changed result" } });
    expect(review).not.toBeChecked(); expect(screen.queryByText(/Self-review record saved/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Concept" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mark as read/ }));
    expect(screen.getByText(/Reading record saved/)).toBeVisible();
    expect(readProgress(localStorage).read).toEqual(["tools"]);
    expect(readProgress(localStorage).evidence.tools).toBe("Changed result");
  });
  it("recovers invalid answer storage and reports a failed write without claiming a saved record", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    localStorage.setItem("incidentlens.curriculum.checks.v1", '{"tools":{"choice":99,"submitted":true}}');
    const { unmount } = render(<I18nProvider><KnowledgeCheck stage="tools" /></I18nProvider>);
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    unmount(); mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
    act(() => fireEvent.click(screen.getByRole("checkbox", { name: /Mark as read/ })));
    expect(screen.getByText(/Browser storage failed/)).toBeVisible();
    expect(screen.queryByText(/Reading record saved/)).not.toBeInTheDocument();
    expect(localStorage.getItem(progressKey)).toBeNull();
  });
});
