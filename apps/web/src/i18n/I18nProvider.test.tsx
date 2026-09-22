import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LOCALE_STORAGE_KEY, useI18n } from "./I18nProvider";
import { dictionaries, translate } from "./translations";
import type { TranslationKey } from "./translations";

function LanguageProbe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <>
      <h1>{t("overview.title")}</h1>
      <span>{t("nav.overview")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value === "en" ? "en" : "ko")
        }
      >
        <option value="ko">{t("language.korean")}</option>
        <option value="en">{t("language.english")}</option>
      </select>
    </>
  );
}
const renderProbe = () =>
  render(
    <I18nProvider>
      <LanguageProbe />
    </I18nProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.querySelector('meta[name="description"]')?.remove();
});

describe("UI language preference", () => {
  it("renders Korean by default and sets accessible document metadata", () => {
    const description = document.createElement("meta");
    description.name = "description";
    document.head.append(description);
    renderProbe();
    expect(screen.getByRole("heading")).toHaveTextContent(
      "장애 전후에 무엇이 달라졌는지 확인하세요.",
    );
    expect(screen.getByText("개요")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "언어 선택" })).toHaveValue(
      "ko",
    );
    expect(document.documentElement).toHaveAttribute("lang", "ko");
    expect(document.title).toBe("IncidentLens · 장애 분석");
    expect(description.content).toBe(dictionaries.ko["shell.description"]);
  });

  it("renders English from the stored preference", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    renderProbe();
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Understand what changed.",
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Select language" }),
    ).toHaveValue("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.title).toBe("IncidentLens · Incident analysis");
  });

  it("switches immediately and preserves the selection after remounting", () => {
    const firstVisit = renderProbe();
    fireEvent.change(screen.getByRole("combobox", { name: "언어 선택" }), {
      target: { value: "en" },
    });
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Understand what changed.",
    );
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    firstVisit.unmount();
    renderProbe();
    expect(
      screen.getByRole("combobox", { name: "Select language" }),
    ).toHaveValue("en");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Select language" }),
      { target: { value: "ko" } },
    );
    expect(screen.getByRole("heading")).toHaveTextContent(
      "장애 전후에 무엇이 달라졌는지 확인하세요.",
    );
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ko");
  });

  it("falls back to Korean for invalid stored locales", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    renderProbe();
    expect(screen.getByRole("combobox", { name: "언어 선택" })).toHaveValue(
      "ko",
    );
    expect(document.documentElement).toHaveAttribute("lang", "ko");
  });

  it("keeps language switching usable when storage reads and writes are denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    renderProbe();
    expect(screen.getByRole("combobox", { name: "언어 선택" })).toHaveValue(
      "ko",
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Understand what changed.",
    );
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });
});

describe("translation dictionary", () => {
  it("has complete nonempty Korean translations with matching interpolation parameters", () => {
    expect(Object.keys(dictionaries.ko).sort()).toEqual(
      Object.keys(dictionaries.en).sort(),
    );
    for (const key of Object.keys(dictionaries.en) as TranslationKey[]) {
      expect(dictionaries.ko[key].trim(), key).not.toBe("");
      const placeholders = (text: string) =>
        text.match(/\{\w+\}/g)?.sort() ?? [];
      expect(placeholders(dictionaries.ko[key]), key).toEqual(
        placeholders(dictionaries.en[key]),
      );
    }
  });

  it("interpolates literal values without changing technical identifiers", () => {
    expect(translate("ko", "common.parameter", { value: 400 })).toBe(
      "파라미터: 400",
    );
    expect(translate("en", "error.http", { status: 409 })).toBe(
      "Request failed (409).",
    );
    expect(
      translate("ko", "fault.activeWarning", {
        scenario: "DOWNSTREAM_LATENCY",
      }),
    ).toBe("장애 주입 활성화 중 · DOWNSTREAM_LATENCY");
    expect(translate("ko", "common.parameter", { value: "$&" })).toBe(
      "파라미터: $&",
    );
  });

  it("describes BEFORE as the pre-recovery stage rather than healthy baseline", () => {
    expect(translate("ko", "phase.before")).toBe("변경 전");
    expect(translate("ko", "phase.beforeActive")).toContain("장애 상태");
    expect(translate("ko", "phase.after")).toBe("복구 후");
  });
});
