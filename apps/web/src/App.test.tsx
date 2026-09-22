import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { EvidenceCard, ExperimentCard, RcaReport } from "./App";
import { api } from "./api";
import type { Evidence, Experiment, Overview, Report } from "./types";

afterEach(() => vi.restoreAllMocks());

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
      new Error("Network unavailable"),
    );
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check that the local stack is running",
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
