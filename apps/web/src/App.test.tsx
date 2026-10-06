import {
  act,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { EvidenceCard, ExperimentCard, RcaReport } from "./App";
import { api, ApiError } from "./api";
import { I18nProvider, LOCALE_STORAGE_KEY } from "./i18n/I18nProvider";
import type { Evidence, Experiment, Overview, Report } from "./types";

function render(ui: ReactNode) {
  return renderUi(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, "en"));
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const emptyOverview: Overview = {
  services: [{ name: "demo-api", status: "UP" }],
  metrics: {
    requestCount: null,
    errorCount: null,
    p95Ms: null,
    kafkaLag: null,
    cacheHitRate: null,
  },
  activeFault: null,
};

describe("incident dashboard", () => {
  it("shows unavailable telemetry and a useful empty state without fabricated values", async () => {
    vi.spyOn(api, "overview").mockResolvedValue(emptyOverview);
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    await screen.findByText("demo-api");
    expect(screen.getAllByText("Unavailable")).toHaveLength(5);
    expect(
      screen.getByText("Your first investigation starts here"),
    ).toBeInTheDocument();
    expect(screen.getByText("up")).toBeInTheDocument();
  });

  it("keeps a prominent active-fault warning and sends the disable action to its owning session", async () => {
    vi.spyOn(api, "overview").mockResolvedValue({
      ...emptyOverview,
      activeFault: {
        sessionId: "owner-session",
        scenario: "KAFKA_SLOWDOWN",
        enabled: true,
        parameter: 400,
        expiresAt: "2026-09-22T12:00:00Z",
      },
    });
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    const setFault = vi.spyOn(api, "setFault").mockResolvedValue(undefined);
    render(<App />);
    await screen.findByText("Fault injection is active · Consumer slowdown");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Disable fault" })),
    );
    await waitFor(() =>
      expect(setFault).toHaveBeenCalledWith("owner-session", false, 400),
    );
  });

  it("displays an actionable connection error", async () => {
    vi.spyOn(api, "overview").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach the control plane.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check that the local stack is running",
    );
  });

  it("defaults to Korean and switches the current view without resetting form input or fetching again", async () => {
    localStorage.clear();
    const overview = vi.spyOn(api, "overview").mockResolvedValue(emptyOverview);
    const sessions = vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "개요" }));
    await screen.findByText("demo-api");
    expect(
      screen.getByRole("heading", {
        name: "장애 전후에 무엇이 달라졌는지 확인하세요.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("확인 불가")).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("button", { name: "자유실험실" })[0]);
    fireEvent.change(screen.getByLabelText("세션 이름"), {
      target: { value: "내 실험 이름" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /데이터베이스 성능 저하/ }),
    );
    const calls = [overview.mock.calls.length, sessions.mock.calls.length];
    fireEvent.change(screen.getByLabelText("언어 선택"), {
      target: { value: "en" },
    });
    expect(
      screen.getByRole("heading", { name: "Make failure reproducible." }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Session name")).toHaveValue("내 실험 이름");
    expect(
      screen.getByRole("radio", { name: /Database degradation/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Database degradation/ }),
    ).toHaveAttribute("value", "DATABASE_DEGRADATION");
    expect([overview.mock.calls.length, sessions.mock.calls.length]).toEqual(
      calls,
    );
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("translates an existing HTTP error while retaining server-provided diagnostic text", async () => {
    localStorage.clear();
    const detail = "A different session owns the active fault.";
    vi.spyOn(api, "overview").mockRejectedValue(
      new ApiError(detail, 409, detail),
    );
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "개요" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `서버 응답: ${detail}`,
    );
    fireEvent.change(screen.getByLabelText("언어 선택"), {
      target: { value: "en" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Server response: ${detail}`,
    );
  });

  it("localizes proxy failures without exposing the proxy response body", async () => {
    localStorage.clear();
    vi.spyOn(api, "overview").mockRejectedValue(
      new ApiError("Request failed (502).", 502),
    );
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "개요" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "요청에 실패했습니다 (502).",
    );
    fireEvent.change(screen.getByLabelText("언어 선택"), {
      target: { value: "en" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Request failed (502).",
    );
  });
});

describe("evidence-grounded reporting", () => {
  it("links a hypothesis citation to its actual evidence and distinguishes confidence from certainty", () => {
    const evidence: Evidence = {
      id: "evidence-01",
      sessionId: "session",
      windowStart: "2026-09-22T12:00:00Z",
      windowEnd: "2026-09-22T12:01:00Z",
      source: "prometheus",
      service: "demo-api",
      type: "LATENCY_P95",
      value: 450,
      unit: "ms",
      traceId: "abc123",
      explanation: "Observed request tail latency increased.",
    };
    const report: Report = {
      summary: "Tail latency is elevated.",
      suspectedRootCause: "A slow downstream operation is a candidate cause.",
      confidence: 0.75,
      evidenceIds: ["evidence-01"],
      impact: "Requests took longer to complete.",
      recommendedActions: ["Disable the fault and repeat the workload."],
      uncertainties: ["No baseline available."],
      provider: "rule-based",
      generatedAt: "2026-09-22T12:01:00Z",
    };
    render(
      <>
        <EvidenceCard evidence={evidence} />
        <RcaReport report={report} />
      </>,
    );
    const citation = screen.getByRole("link", { name: "evidence-01 ↗" });
    expect(citation).toHaveAttribute("href", "#evidence-evidence-01");
    expect(
      document.querySelector(citation.getAttribute("href")!),
    ).toHaveTextContent(evidence.explanation);
    expect(
      screen.getByText(/not a calibrated probability/),
    ).toBeInTheDocument();
    expect(screen.getByText("No baseline available.")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("preserves pending and unavailable comparisons instead of implying zero improvement", () => {
    const experiment: Experiment = {
      id: "experiment-1",
      sessionId: "session-1",
      status: "CREATED",
      workload: { vus: 2, durationSeconds: 20 },
      before: {
        requestCount: 10,
        errorCount: 0,
        throughput: 0.5,
        successRate: 1,
        p50Ms: 20,
        p95Ms: 30,
        p99Ms: 40,
        dbQueryP95Ms: null,
        kafkaLag: null,
        cacheHitRate: null,
      },
      after: null,
      createdAt: "2026-09-22T12:00:00Z",
    };
    render(
      <ExperimentCard
        experiment={experiment}
        scenario="DOWNSTREAM_LATENCY"
        parameter={600}
      />,
    );
    expect(screen.getAllByText("Pending")).toHaveLength(10);
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
    expect(
      screen.getByText(/-SessionId session-1 -ExperimentId experiment-1/),
    ).toBeInTheDocument();
    expect(screen.getByText(/-Vus 2 -DurationSeconds 20/)).toBeInTheDocument();
    expect(screen.getByText(/-Parameter 600/)).toBeInTheDocument();
  });
});
