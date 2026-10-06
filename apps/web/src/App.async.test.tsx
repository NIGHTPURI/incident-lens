import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api, ApiError } from "./api";
import { I18nProvider, LOCALE_STORAGE_KEY } from "./i18n/I18nProvider";
import type { Overview, SessionDetail } from "./types";

const overview: Overview = {
  services: [{ name: "demo-api", status: "UP" }],
  metrics: {
    requestCount: 1,
    errorCount: 0,
    p95Ms: 20,
    kafkaLag: 0,
    cacheHitRate: 1,
  },
  activeFault: null,
};
function detail(id: string, explanation = `Evidence for ${id}`): SessionDetail {
  return {
    session: {
      id,
      name: id,
      scenario: "DOWNSTREAM_LATENCY",
      status: "CREATED",
      createdAt: "2026-09-22T12:00:00Z",
      updatedAt: "2026-09-22T12:00:00Z",
    },
    activations: [],
    experiments: [],
    report: null,
    evidence: [
      {
        id: `evidence-${id}`,
        sessionId: id,
        service: "demo-api",
        source: "test",
        type: "LATENCY_P95",
        value: 20,
        unit: "ms",
        windowStart: "2026-09-22T12:00:00Z",
        windowEnd: "2026-09-22T12:01:00Z",
        explanation,
      },
    ],
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function mount() {
  await act(async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );
  });
  await click("Overview");
}
async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name })[0]);
  });
}
beforeEach(() => {
  localStorage.setItem("incidentlens.learning.session", "session-a");
  vi.useFakeTimers();
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  vi.spyOn(api, "overview").mockResolvedValue(overview);
  vi.spyOn(api, "sessions").mockResolvedValue([
    detail("session-a").session,
    detail("session-b").session,
  ]);
  vi.spyOn(api, "session").mockImplementation(async (id) => detail(id));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("freshness and session isolation", () => {
  it("does not present an unreachable fault store as a disabled fault", async () => {
    vi.mocked(api.overview).mockResolvedValue({
      ...overview,
      services: [{ name: "redis", status: "UNAVAILABLE" }],
      activeFault: null,
    });
    await mount();
    const state = document.querySelector(".overview-state")!;
    expect(state).toHaveTextContent("Fault status unavailable");
    expect(state).not.toHaveTextContent("fault disabled");
  });

  it("ignores an older overview response arriving after a newer refresh", async () => {
    await mount();
    const slow = deferred<Overview>();
    vi.mocked(api.overview)
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue({
        ...overview,
        metrics: { ...overview.metrics, requestCount: 30 },
      });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await click("Refresh dashboard");
    const card = screen.getByText("Request count").closest("article")!;
    expect(within(card).getByText("30")).toBeInTheDocument();
    await act(async () => {
      slow.resolve({
        ...overview,
        metrics: { ...overview.metrics, requestCount: 2 },
      });
    });
    expect(within(card).getByText("30")).toBeInTheDocument();
  });

  it("does not overwrite action-refreshed evidence with an earlier poll", async () => {
    await mount();
    await click("Evidence & RCA");
    const oldPoll = deferred<SessionDetail>();
    vi.mocked(api.session)
      .mockReturnValueOnce(oldPoll.promise)
      .mockResolvedValue(
        detail("session-a", "Fresh evidence after collection"),
      );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    vi.spyOn(api, "collect").mockResolvedValue([]);
    await click("Collect evidence");
    expect(
      screen.getByText("Fresh evidence after collection"),
    ).toBeInTheDocument();
    await act(async () => {
      oldPoll.resolve(detail("session-a", "Outdated evidence from slow poll"));
    });
    expect(
      screen.getByText("Fresh evidence after collection"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Outdated evidence from slow poll"),
    ).not.toBeInTheDocument();
  });

  it("keeps a detail error visible through healthy overview refreshes until that detail recovers", async () => {
    vi.mocked(api.session).mockRejectedValue(
      new ApiError(
        "Session temporarily unavailable.",
        503,
        "Session temporarily unavailable.",
      ),
    );
    await mount();
    await click("Evidence & RCA");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Session temporarily unavailable.",
    );
    expect(
      screen.getByText("Incident data could not be loaded"),
    ).toBeInTheDocument();
    await click("Refresh dashboard");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Session temporarily unavailable.",
    );
    vi.mocked(api.session).mockResolvedValue(detail("session-a"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Evidence for session-a")).toBeInTheDocument();
  });

  it("prevents a session change through Inspect while an incident mutation is in flight", async () => {
    await mount();
    await click("Evidence & RCA");
    const mutation = deferred<[]>();
    vi.spyOn(api, "collect").mockReturnValue(mutation.promise);
    await click("Collect evidence");
    await click("Overview");
    const inspect = screen.getAllByRole("button", { name: "Inspect →" });
    for (const button of inspect) expect(button).toBeDisabled();
    await act(async () => {
      mutation.resolve([]);
    });
    await act(async () => {
      fireEvent.click(inspect[1]);
    });
    expect(screen.getByLabelText("Incident session")).toHaveValue("session-b");
    expect(screen.getByText("Evidence for session-b")).toBeInTheDocument();
    expect(
      screen.queryByText("Evidence for session-a"),
    ).not.toBeInTheDocument();
  });

  it("explains absent samples without replacing measured zeros", async () => {
    vi.mocked(api.overview).mockResolvedValue({
      ...overview,
      metrics: { ...overview.metrics, requestCount: 0, p95Ms: null },
    });
    await mount();
    const count = screen.getByText("Request count").closest("article")!;
    const lag = screen.getByText("Consumer lag").closest("article")!;
    expect(within(count).getByText("0")).toBeInTheDocument();
    expect(within(lag).getByText("0")).toBeInTheDocument();
    const latency = screen.getByText("Sampled p95 latency").closest("article")!;
    expect(within(latency).getByText("Unavailable")).toBeInTheDocument();
    expect(
      within(latency).getByText(/No measured requests/),
    ).toBeInTheDocument();
  });
});

describe("transient operation feedback scope", () => {
  it("invalidates an in-flight lesson operation when its lesson changes", async () => {
    localStorage.setItem("incidentlens.learning.mode", "reference");
    localStorage.setItem("incidentlens.learning.view", "lesson");
    localStorage.setItem("incidentlens.learning.lesson", "diagnose");
    vi.mocked(api.overview).mockResolvedValue({ ...overview, services: ["demo-api", "demo-worker", "redis"].map(name => ({ name, status: "UP" })) });
    const pending = deferred<[]>(); vi.spyOn(api, "collect").mockReturnValue(pending.promise);
    await mount(); await click("Backend Learning");
    await click("Collect AFTER evidence");
    expect(api.collect).toHaveBeenCalledTimes(1);
    await click("Previous lesson");
    await act(async () => pending.resolve([]));
    expect(document.querySelector(".message.success")).not.toBeInTheDocument();
  });
  const success = "Evidence collected from the observation window.";
  async function collectScreen() { await mount(); await click("Evidence & RCA"); }
  async function learning() {
    await act(async () => { fireEvent.click(document.querySelector('.primary-navigation button:nth-child(2)')!); });
  }
  it("removes a completed notice on navigation and does not restore it on return", async () => {
    vi.spyOn(api, "collect").mockResolvedValue([]);
    await collectScreen(); await click("Collect evidence");
    expect(screen.getByText(success)).toBeInTheDocument();
    await learning(); expect(screen.queryByText(success)).not.toBeInTheDocument();
    await click("Evidence & RCA"); expect(screen.queryByText(success)).not.toBeInTheDocument();
  });
  it("discards a late success even when the user returns to its original route", async () => {
    const pending = deferred<[]>(); vi.spyOn(api, "collect").mockReturnValue(pending.promise);
    await collectScreen(); await click("Collect evidence");
    await learning(); await click("Evidence & RCA");
    await act(async () => pending.resolve([]));
    expect(screen.queryByText(success)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collect evidence" })).toBeEnabled();
  });
  it("discards a late failure after navigation but still shows a current failure", async () => {
    const pending = deferred<[]>(); vi.spyOn(api, "collect").mockReturnValueOnce(pending.promise)
      .mockRejectedValue(new Error("current operation failed"));
    await collectScreen(); await click("Collect evidence"); await learning();
    await act(async () => pending.reject(new Error("obsolete operation failed")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await click("Evidence & RCA"); await click("Collect evidence");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await learning(); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("invalidates feedback when the selected session changes", async () => {
    vi.spyOn(api, "collect").mockResolvedValue([]);
    await collectScreen(); await click("Collect evidence");
    await act(async () => fireEvent.change(screen.getByLabelText("Incident session"), { target: { value: "session-b" } }));
    expect(screen.queryByText(success)).not.toBeInTheDocument();
  });
  it("keeps the global active fault warning through lesson, tab and OS navigation", async () => {
    vi.mocked(api.overview).mockResolvedValue({ ...overview,
      services: [{ name: "redis", status: "UP" }],
      activeFault: { sessionId: "session-a", scenario: "DOWNSTREAM_LATENCY", enabled: true, parameter: 100, expiresAt: "2026-10-04T00:00:00Z" } });
    await mount(); await learning(); await click("Start learning");
    const warning = document.querySelector(".fault-banner");
    expect(warning).toBeInTheDocument();
    await click("Next lesson"); await act(async () => fireEvent.click(screen.getByRole("tab", { name: "Flow & notes" })));
    expect(document.querySelector(".fault-banner")).toHaveTextContent(warning!.textContent!);
    await act(async () => fireEvent.change(screen.getByLabelText("Learning OS / shell"), { target: { value: "windows" } }));
    expect(document.querySelector(".fault-banner")).toHaveTextContent(warning!.textContent!);
  });
  it("does not let late session creation hijack a new learning context", async () => {
    const pending = deferred<ReturnType<typeof detail>["session"]>();
    vi.spyOn(api, "createSession").mockReturnValue(pending.promise);
    await mount();
    await click("Free experiment lab");
    const create = screen.getByRole("button", { name: /Create session/i });
    await act(async () => fireEvent.click(create));
    await learning();
    await act(async () => pending.resolve(detail("new-session").session));
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".message.success")).not.toBeInTheDocument();
    expect(localStorage.getItem("incidentlens.learning.session")).toBe("session-a");
  });
});
