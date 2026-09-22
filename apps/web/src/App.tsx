import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "./api";
import { change, date, milliseconds, number, percent } from "./format";
import type {
  Evidence,
  Experiment,
  IncidentSession,
  Metrics,
  Overview,
  Report,
  Scenario,
  SessionDetail,
} from "./types";

const scenarios: {
  value: Scenario;
  title: string;
  description: string;
  symbol: string;
  parameter: string;
  defaultParameter: number;
}[] = [
  {
    value: "DOWNSTREAM_LATENCY",
    title: "Downstream latency",
    description:
      "Delay a dependency in the request path and inspect its effect on tail latency.",
    symbol: "01",
    parameter: "Added latency (ms)",
    defaultParameter: 350,
  },
  {
    value: "DATABASE_DEGRADATION",
    title: "Database degradation",
    description:
      "Switch to an inefficient query path and compare database lookup duration.",
    symbol: "02",
    parameter: "Scenario parameter",
    defaultParameter: 0,
  },
  {
    value: "KAFKA_SLOWDOWN",
    title: "Consumer slowdown",
    description:
      "Slow asynchronous processing, build a backlog, then watch the worker recover.",
    symbol: "03",
    parameter: "Processing delay (ms)",
    defaultParameter: 500,
  },
  {
    value: "CACHE_DEGRADATION",
    title: "Cache degradation",
    description:
      "Bypass the cache and measure the extra database work under the same traffic.",
    symbol: "04",
    parameter: "Scenario parameter",
    defaultParameter: 0,
  },
];

type Page = "overview" | "lab" | "evidence" | "comparison";
const pages: { id: Page; label: string; symbol: string }[] = [
  { id: "overview", label: "Overview", symbol: "◫" },
  { id: "lab", label: "Incident lab", symbol: "⌁" },
  { id: "evidence", label: "Evidence & RCA", symbol: "≡" },
  { id: "comparison", label: "Experiments", symbol: "⇄" },
];

function scenarioName(value: Scenario) {
  return scenarios.find((s) => s.value === value)?.title ?? value;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-symbol">⌕</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const healthy = [
    "UP",
    "HEALTHY",
    "COMPLETED",
    "COMPLETE",
    "DISABLED",
  ].includes(value.toUpperCase());
  return (
    <span className={`status ${healthy ? "good" : "neutral"}`}>
      <span />
      {value.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="stat">
      <span className="eyebrow">{label}</span>
      <strong className={value === "Unavailable" ? "unavailable" : ""}>
        {value}
      </strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sessions, setSessions] = useState<IncidentSession[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [collectionPhase, setCollectionPhase] = useState<"BEFORE" | "AFTER">(
    "BEFORE",
  );

  const refresh = useCallback(async () => {
    try {
      const [nextOverview, nextSessions] = await Promise.all([
        api.overview(),
        api.sessions(),
      ]);
      setOverview(nextOverview);
      setSessions(nextSessions);
      setUpdatedAt(new Date().toISOString());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to reach the control plane.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);
  useEffect(() => {
    if (!selectedId && sessions.length) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setDetail(null);
    const load = async () => {
      try {
        const next = await api.session(selectedId);
        if (alive) setDetail(next);
      } catch (cause) {
        if (alive)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load the incident.",
          );
      }
    };
    void load();
    const interval = setInterval(() => {
      void load();
    }, 10_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [selectedId]);

  async function action(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      await refresh();
      if (selectedId) setDetail(await api.session(selectedId));
      setNotice(success);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createSession(name: string, scenario: Scenario) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await api.createSession(name, scenario);
      await refresh();
      setSelectedId(created.id);
      setNotice("Incident session created. Enable the fault when ready.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create a session.",
      );
    } finally {
      setBusy(false);
    }
  }

  const active = overview?.activeFault?.enabled ? overview.activeFault : null;
  const selection = (
    <label className="session-select">
      <span>Incident session</span>
      <select
        aria-label="Incident session"
        disabled={busy}
        value={selectedId}
        onChange={(event) => {
          setSelectedId(event.target.value);
          setNotice("");
        }}
      >
        {sessions.length === 0 && <option value="">No sessions yet</option>}
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name} · {scenarioName(session.scenario)}
          </option>
        ))}
      </select>
    </label>
  );
  const currentPage = pages.find((item) => item.id === page)!;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage("overview");
          }}
          aria-label="IncidentLens home"
        >
          <span className="brand-mark">iL</span>
          <span>
            Incident<span className="brand-light">Lens</span>
            <small>ENGINEERING WORKSPACE</small>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "selected" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => setPage(item.id)}
            >
              <span aria-hidden="true">{item.symbol}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <strong>Local incident laboratory</strong>
          <p>
            Controlled failures.
            <br />
            Observable consequences.
            <br />
            Evidence before inference.
          </p>
        </div>
        <div className="sidebar-footer">
          Java · Kafka · OpenTelemetry<span>Evidence-grounded by design</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span>/</span> {currentPage.label}
          </span>
          <div className="topbar-right">
            <span className="local-tag">LOCAL ENVIRONMENT</span>
            <button
              className="button ghost compact"
              onClick={() => {
                void refresh();
              }}
              disabled={busy || loading}
              aria-label="Refresh dashboard"
            >
              ↻ Refresh
            </button>
          </div>
        </header>
        <div className="page-content">
          {active && (
            <div className="fault-banner" role="status">
              <span className="warning-icon">!</span>
              <div>
                <strong>
                  Fault injection is active · {scenarioName(active.scenario)}
                </strong>
                <span>
                  Expires {date(active.expiresAt)} · session{" "}
                  {active.sessionId.slice(0, 8)}
                </span>
              </div>
              <button
                className="button warning"
                disabled={busy}
                onClick={() => {
                  void action(
                    () =>
                      api.setFault(active.sessionId, false, active.parameter),
                    "Fault disabled. Recovery can now be measured.",
                  );
                }}
              >
                Disable fault
              </button>
            </div>
          )}
          {error && (
            <div className="message error" role="alert">
              <strong>Request could not be completed.</strong> {error}{" "}
              <span>
                Check that the local stack is running. Previously loaded values
                may be stale.
              </span>
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              {notice}
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                INCIDENTLENS / {currentPage.label.toUpperCase()}
              </span>
              <h1>
                {page === "overview"
                  ? "Understand what changed."
                  : page === "lab"
                    ? "Make failure reproducible."
                    : page === "evidence"
                      ? "Follow the evidence."
                      : "Measure the recovery."}
              </h1>
              <p>
                {page === "overview"
                  ? "A focused view of service health, runtime signals, and your latest investigations."
                  : page === "lab"
                    ? "Create a session, apply one controlled fault, and observe the system response."
                    : page === "evidence"
                      ? "Observed signals, explicit provenance, and hypotheses you can verify."
                      : "Run an identical workload before and after disabling a fault."}
              </p>
            </div>
            <span className="last-updated">
              {loading
                ? "Connecting to control plane…"
                : updatedAt
                  ? `Updated ${date(updatedAt)}`
                  : "Waiting for telemetry"}
            </span>
          </div>

          {page === "overview" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Request count"
                  value={number(overview?.metrics.requestCount)}
                  detail="Cumulative across retained session scopes"
                />
                <Stat
                  label="Request error rate"
                  value={percent(
                    overview?.metrics.requestCount &&
                      overview.metrics.errorCount != null
                      ? overview.metrics.errorCount /
                          overview.metrics.requestCount
                      : null,
                  )}
                  detail={`${number(overview?.metrics.errorCount)} errors across retained session scopes`}
                />
                <Stat
                  label="Sampled p95 latency"
                  value={milliseconds(overview?.metrics.p95Ms)}
                  detail="Bounded sample across retained session scopes"
                />
                <Stat
                  label="Consumer lag"
                  value={number(overview?.metrics.kafkaLag)}
                  detail="Events waiting for processing"
                />
              </div>
              <p className="telemetry-scope">
                Overview uses retained in-memory diagnostics and resets on
                service restart. Counts are cumulative; use experiments for
                workload throughput and comparable phase measurements.
              </p>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <span className="eyebrow">RUNTIME</span>
                      <h2>Service connectivity</h2>
                    </div>
                    <span className="tag">ENDPOINT CHECKS</span>
                  </div>
                  {overview?.services.length ? (
                    <div className="services">
                      {overview.services.map((service) => (
                        <div className="service" key={service.name}>
                          <span className="service-symbol">▣</span>
                          <div>
                            <strong>{service.name}</strong>
                            <span>
                              {service.name === "redis"
                                ? "Shared fault store connectivity"
                                : service.name === "control-plane"
                                  ? "Control plane API responding"
                                  : "Telemetry endpoint connectivity"}
                            </span>
                          </div>
                          <Status value={service.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No health data yet">
                      Start the stack to connect the backend services.
                    </Empty>
                  )}
                  <div className="panel-footer">
                    <span>Cache hit rate</span>
                    <strong>{percent(overview?.metrics.cacheHitRate)}</strong>
                  </div>
                </section>
                <section className="panel workflow">
                  <span className="eyebrow">THE EXPERIMENT LOOP</span>
                  <h2>A hypothesis is a starting point.</h2>
                  <p>
                    Use controlled failures and repeatable traffic to
                    distinguish the symptom from its cause.
                  </p>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Inject a failure</strong>
                        <p>Select a scenario and a bounded fault parameter.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Collect and correlate</strong>
                        <p>
                          Build a structured evidence package with source
                          references.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Recover and compare</strong>
                        <p>
                          Repeat the workload and inspect measured differences.
                        </p>
                      </div>
                    </li>
                  </ol>
                  <button
                    className="button primary"
                    onClick={() => setPage("lab")}
                  >
                    Open incident lab <span>→</span>
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">INVESTIGATIONS</span>
                    <h2>Recent incident sessions</h2>
                  </div>
                  <button
                    className="button ghost compact"
                    onClick={() => setPage("lab")}
                  >
                    New session +
                  </button>
                </div>
                {sessions.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Session</th>
                          <th>Scenario</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>
                            <span className="sr-only">Open</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr key={session.id}>
                            <td>
                              <strong>{session.name}</strong>
                              <small className="mono">
                                {session.id.slice(0, 8)}
                              </small>
                            </td>
                            <td>{scenarioName(session.scenario)}</td>
                            <td>
                              <Status value={session.status} />
                            </td>
                            <td>{date(session.createdAt)}</td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setSelectedId(session.id);
                                  setPage("evidence");
                                }}
                              >
                                Inspect →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="Your first investigation starts here">
                    Create an incident session in the lab. Real measurements
                    appear once you run traffic.
                  </Empty>
                )}
              </section>
            </>
          )}

          {page === "lab" && (
            <>
              <IncidentLab busy={busy} createSession={createSession} />
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">FAULT CONTROL</span>
                    <h2>Selected incident</h2>
                  </div>
                  {selection}
                </div>
                {detail ? (
                  <FaultControl
                    key={detail.session.id}
                    detail={detail}
                    activeSessionId={active?.sessionId}
                    busy={busy}
                    setFault={(enabled, parameter) => {
                      void action(
                        () =>
                          api.setFault(detail.session.id, enabled, parameter),
                        enabled
                          ? "Fault enabled. Run traffic to collect evidence."
                          : "Fault disabled. Run the same workload to measure recovery.",
                      );
                    }}
                  />
                ) : (
                  <Empty
                    title={
                      selectedId
                        ? "Loading incident…"
                        : "Create a session to begin"
                    }
                  >
                    Each session keeps its fault history, evidence, and
                    experiment results together.
                  </Empty>
                )}
              </section>
            </>
          )}

          {page === "evidence" && (
            <>
              <div className="toolbar">
                {selection}
                <div className="toolbar-actions">
                  <label className="phase-select">
                    Observation phase
                    <select
                      value={collectionPhase}
                      onChange={(event) =>
                        setCollectionPhase(
                          event.target.value as "BEFORE" | "AFTER",
                        )
                      }
                    >
                      <option value="BEFORE">BEFORE · fault active</option>
                      <option value="AFTER">AFTER · fault disabled</option>
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    disabled={!detail || busy}
                    onClick={() => {
                      void action(
                        () => api.collect(selectedId, collectionPhase),
                        "Evidence collected from the observation window.",
                      );
                    }}
                  >
                    Collect evidence
                  </button>
                  <button
                    className="button primary"
                    disabled={!detail || busy}
                    onClick={() => {
                      void action(
                        () => api.analyze(selectedId),
                        "RCA report generated. Review the citations and uncertainties.",
                      );
                    }}
                  >
                    {busy ? "Working…" : "Generate RCA"}
                  </button>
                </div>
              </div>
              {detail ? (
                <>
                  <div className="evidence-layout">
                    <section className="panel">
                      <div className="panel-header">
                        <div>
                          <span className="eyebrow">OBSERVED EVIDENCE</span>
                          <h2>Correlated signals</h2>
                        </div>
                        <span className="count">{detail.evidence.length}</span>
                      </div>
                      {detail.evidence.length ? (
                        <div className="evidence-list">
                          {detail.evidence.map((item) => (
                            <EvidenceCard key={item.id} evidence={item} />
                          ))}
                        </div>
                      ) : (
                        <Empty title="No evidence collected">
                          Run traffic with the fault enabled, then collect
                          evidence. Missing telemetry stays unavailable.
                        </Empty>
                      )}
                    </section>
                    <section className="panel timeline-panel">
                      <div className="panel-header">
                        <div>
                          <span className="eyebrow">INCIDENT HISTORY</span>
                          <h2>Timeline</h2>
                        </div>
                      </div>
                      <ol className="timeline">
                        <li>
                          <span className="timeline-point" />
                          <strong>Session created</strong>
                          <time>{date(detail.session.createdAt)}</time>
                          <p>{scenarioName(detail.session.scenario)}</p>
                        </li>
                        {detail.activations.map((activation, index) => (
                          <li key={`${activation.occurredAt}-${index}`}>
                            <span
                              className={`timeline-point ${activation.enabled ? "orange" : ""}`}
                            />
                            <strong>
                              Fault{" "}
                              {activation.enabled ? "enabled" : "disabled"}
                            </strong>
                            <time>{date(activation.occurredAt)}</time>
                            <p>Parameter: {activation.parameter}</p>
                          </li>
                        ))}
                        {detail.report && (
                          <li>
                            <span className="timeline-point" />
                            <strong>RCA generated</strong>
                            <time>{date(detail.report.generatedAt)}</time>
                            <p>{detail.report.provider}</p>
                          </li>
                        )}
                      </ol>
                    </section>
                  </div>
                  <RcaReport report={detail.report} />
                </>
              ) : (
                <section className="panel">
                  <Empty
                    title={
                      selectedId
                        ? "Loading incident…"
                        : "Select an incident session"
                    }
                  >
                    Start an investigation in the incident lab to collect
                    evidence and generate a report.
                  </Empty>
                </section>
              )}
            </>
          )}

          {page === "comparison" && (
            <>
              <div className="toolbar">{selection}</div>
              {detail ? (
                <>
                  <ExperimentSetup
                    detail={detail}
                    busy={busy}
                    create={(workload) => {
                      void action(
                        () => api.createExperiment(detail.session.id, workload),
                        "Experiment created. Run the displayed command to execute both phases.",
                      );
                    }}
                  />
                  {detail.experiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      scenario={detail.session.scenario}
                      parameter={
                        [...detail.activations]
                          .reverse()
                          .find((activation) => activation.enabled)
                          ?.parameter ?? 400
                      }
                    />
                  ))}
                  {detail.experiments.length === 0 && (
                    <section className="panel">
                      <Empty title="No experiments recorded">
                        Create an experiment, then run the generated command.
                        Both phases use the same virtual users and duration.
                      </Empty>
                    </section>
                  )}
                </>
              ) : (
                <section className="panel">
                  <Empty title="Select an incident session">
                    Experiment measurements are stored with the incident they
                    investigate.
                  </Empty>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>IncidentLens</span>Controlled local experiments · Missing data
            is never replaced with sample measurements.
          </footer>
        </div>
      </main>
    </div>
  );
}

function IncidentLab({
  busy,
  createSession,
}: {
  busy: boolean;
  createSession: (name: string, scenario: Scenario) => Promise<void>;
}) {
  const [scenario, setScenario] = useState<Scenario>("DOWNSTREAM_LATENCY");
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void createSession(
      name.trim() || `${scenarioName(scenario)} investigation`,
      scenario,
    );
  };
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">CREATE AN INVESTIGATION</span>
          <h2>Choose a failure scenario</h2>
        </div>
        <span className="tag">4 CONTROLLED SCENARIOS</span>
      </div>
      <form onSubmit={submit}>
        <fieldset className="scenario-grid">
          <legend className="sr-only">Failure scenario</legend>
          {scenarios.map((item) => (
            <label
              key={item.value}
              className={`scenario-card ${scenario === item.value ? "chosen" : ""}`}
            >
              <input
                type="radio"
                name="scenario"
                value={item.value}
                checked={scenario === item.value}
                onChange={() => setScenario(item.value)}
              />
              <span className="scenario-number">{item.symbol}</span>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </label>
          ))}
        </fieldset>
        <div className="create-session-row">
          <label>
            Session name
            <input
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`${scenarioName(scenario)} investigation`}
            />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            Create session +
          </button>
        </div>
      </form>
    </section>
  );
}

function FaultControl({
  detail,
  activeSessionId,
  busy,
  setFault,
}: {
  detail: SessionDetail;
  activeSessionId?: string;
  busy: boolean;
  setFault: (enabled: boolean, parameter: number) => void;
}) {
  const scenario = scenarios.find(
    (item) => item.value === detail.session.scenario,
  )!;
  const [parameter, setParameter] = useState(scenario.defaultParameter);
  const active = activeSessionId === detail.session.id;
  const conflicting = !!activeSessionId && !active;
  const usesParameter = ["DOWNSTREAM_LATENCY", "KAFKA_SLOWDOWN"].includes(
    scenario.value,
  );
  return (
    <div className="fault-control">
      <div>
        <h3>{detail.session.name}</h3>
        <p>{scenario.description}</p>
        <span className="mono muted">{detail.session.id}</span>
        {conflicting && (
          <p className="warning-text">
            Another session has an active fault. Disable it before activating
            this one.
          </p>
        )}
      </div>
      <div className="fault-actions">
        {usesParameter && (
          <label>
            {scenario.parameter}
            <input
              type="number"
              min={0}
              max={2000}
              step={50}
              value={parameter}
              onChange={(event) => setParameter(Number(event.target.value))}
            />
          </label>
        )}
        <button
          className={`button ${active ? "warning" : "primary"}`}
          disabled={
            busy ||
            conflicting ||
            !Number.isInteger(parameter) ||
            parameter < 0 ||
            parameter > 2000
          }
          onClick={() => setFault(!active, parameter)}
        >
          {active ? "Disable fault" : "Enable fault"}
        </button>
        <span className="muted">
          Faults expire automatically. Disabling a fault during an experiment
          aborts its active run.
        </span>
      </div>
    </div>
  );
}

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <article className="evidence-card" id={`evidence-${evidence.id}`}>
      <div className="evidence-title">
        <span className="tag">{evidence.service}</span>
        {evidence.phase && <span className="tag">{evidence.phase}</span>}
        <strong>
          {number(evidence.value, 3)}{" "}
          {evidence.value == null ? "" : evidence.unit}
        </strong>
      </div>
      <h3>{evidence.type.replaceAll("_", " ").toLowerCase()}</h3>
      <p>{evidence.explanation}</p>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{evidence.source}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>
            {date(evidence.windowStart)} — {date(evidence.windowEnd)}
          </dd>
        </div>
        <div>
          <dt>Evidence ID</dt>
          <dd className="mono">{evidence.id}</dd>
        </div>
        {evidence.traceId && (
          <div>
            <dt>Trace ID</dt>
            <dd className="mono">{evidence.traceId}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function RcaReport({ report }: { report: Report | null }) {
  return (
    <section className="panel rca-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">EVIDENCE-GROUNDED ANALYSIS</span>
          <h2>Root cause report</h2>
        </div>
        {report && <span className="tag">{report.provider}</span>}
      </div>
      {report ? (
        <div className="rca-content">
          <p className="report-summary">{report.summary}</p>
          <div className="hypothesis">
            <div>
              <span className="eyebrow">ROOT CAUSE HYPOTHESIS · INFERENCE</span>
              <h3>{report.suspectedRootCause}</h3>
            </div>
            <div className="confidence">
              <strong>{percent(report.confidence)}</strong>
              <span>provider confidence</span>
            </div>
          </div>
          <div className="report-citations">
            <strong>Supporting evidence</strong>
            {report.evidenceIds.map((id) => (
              <a key={id} className="citation mono" href={`#evidence-${id}`}>
                {id.slice(0, 12)} ↗
              </a>
            ))}
          </div>
          <div className="report-grid">
            <div>
              <h3>Observed impact</h3>
              <p>{report.impact}</p>
              <h3>Recommended actions</h3>
              <ul>
                {report.recommendedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
            <div className="uncertainties">
              <h3>Uncertainties</h3>
              <ul>
                {report.uncertainties.map((uncertainty, i) => (
                  <li key={i}>{uncertainty}</li>
                ))}
              </ul>
              <p>
                Confidence is the provider's assessment, not a calibrated
                probability. Validate the hypothesis with a recovery experiment.
              </p>
            </div>
          </div>
          <span className="muted">Generated {date(report.generatedAt)}</span>
        </div>
      ) : (
        <Empty title="No RCA report yet">
          Collect evidence, then generate an analysis. Rule-based RCA works
          without an API key.
        </Empty>
      )}
    </section>
  );
}

function ExperimentSetup({
  detail,
  busy,
  create,
}: {
  detail: SessionDetail;
  busy: boolean;
  create: (workload: { vus: number; durationSeconds: number }) => void;
}) {
  const [vus, setVus] = useState(2);
  const [duration, setDuration] = useState(20);
  if (detail.experiments.length > 0)
    return (
      <div className="experiment-guidance">
        This session already has an experiment. Create a new incident session to
        run a separate comparison with independent telemetry windows.
      </div>
    );
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">REPEATABLE WORKLOAD</span>
          <h2>Prepare an experiment</h2>
        </div>
        <span className="tag">{scenarioName(detail.session.scenario)}</span>
      </div>
      <div className="experiment-setup">
        <p>
          The runner enables the fault for <strong>BEFORE</strong>, disables it
          for <strong>AFTER</strong>, and sends real k6 results to the control
          plane. Creating a record here does not start traffic. Prepare the
          experiment before sending scoped traffic; use a new incident session
          if a manual workload already used this session.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create({ vus, durationSeconds: duration });
          }}
        >
          <label>
            Virtual users
            <input
              type="number"
              min={1}
              max={50}
              required
              value={vus}
              onChange={(event) => setVus(Number(event.target.value))}
            />
          </label>
          <label>
            Duration per phase (s)
            <input
              type="number"
              min={5}
              max={300}
              required
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            Create experiment
          </button>
        </form>
      </div>
    </section>
  );
}

const comparisonRows: {
  key: keyof Metrics;
  label: string;
  format: (value: number | null | undefined) => string;
  lowerBetter: boolean;
}[] = [
  {
    key: "requestCount",
    label: "Requests",
    format: number,
    lowerBetter: false,
  },
  {
    key: "throughput",
    label: "Throughput (req/s)",
    format: (value) => number(value, 2),
    lowerBetter: false,
  },
  {
    key: "successRate",
    label: "Success rate",
    format: percent,
    lowerBetter: false,
  },
  {
    key: "p50Ms",
    label: "p50 request latency",
    format: milliseconds,
    lowerBetter: true,
  },
  {
    key: "p95Ms",
    label: "p95 request latency",
    format: milliseconds,
    lowerBetter: true,
  },
  {
    key: "p99Ms",
    label: "p99 request latency",
    format: milliseconds,
    lowerBetter: true,
  },
  {
    key: "dbQueryP95Ms",
    label: "DB lookup p95",
    format: milliseconds,
    lowerBetter: true,
  },
  {
    key: "kafkaLag",
    label: "Consumer lag (events)",
    format: number,
    lowerBetter: true,
  },
  {
    key: "cacheHitRate",
    label: "Cache hit rate",
    format: percent,
    lowerBetter: false,
  },
  { key: "errorCount", label: "Errors", format: number, lowerBetter: true },
];

export function ExperimentCard({
  experiment,
  scenario,
  parameter = 400,
}: {
  experiment: Experiment;
  scenario: Scenario;
  parameter?: number;
}) {
  const [copied, setCopied] = useState(false);
  const command = `.\\scripts\\demo-compare.ps1 -Scenario ${scenario} -SessionId ${experiment.sessionId} -ExperimentId ${experiment.id} -Vus ${experiment.workload.vus} -DurationSeconds ${experiment.workload.durationSeconds} -Parameter ${parameter}`;
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">BEFORE / AFTER</span>
          <h2>
            Experiment{" "}
            <span className="mono small">{experiment.id.slice(0, 8)}</span>
          </h2>
        </div>
        <Status value={experiment.status} />
      </div>
      <div className="experiment-meta">
        <span>{experiment.workload.vus} virtual users</span>
        <span>{experiment.workload.durationSeconds}s per phase</span>
        <span>Created {date(experiment.createdAt)}</span>
      </div>
      {experiment.status === "CREATED" && (
        <div className="command-panel">
          <div>
            <strong>Run from the repository root in PowerShell</strong>
            <button
              className="text-button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(command)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? "Copied" : "Copy command"}
            </button>
          </div>
          <pre>
            <code>{command}</code>
          </pre>
          <p>
            The dashboard refreshes automatically. The script owns fault
            activation, k6 execution, evidence collection, and result
            submission.
          </p>
        </div>
      )}
      {experiment.status.endsWith("_RUNNING") && (
        <div className="experiment-guidance" role="status">
          The workload is running. Results appear when the runner completes this
          phase. Disabling the fault now aborts the active run.
        </div>
      )}
      {experiment.status === "BEFORE_COMPLETE" && (
        <div className="experiment-guidance">
          BEFORE is recorded. The active runner will disable the fault and start
          AFTER. If the runner stopped, create a new session and experiment; a
          partial run cannot be restarted with the comparison command.
        </div>
      )}
      {experiment.status === "ABORTED" && (
        <div className="experiment-guidance">
          This experiment was aborted. Its partial measurements are retained.
          Create a new session and experiment to run a complete comparison.
        </div>
      )}
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Measurement</th>
              <th>
                BEFORE <span>fault active</span>
              </th>
              <th>
                AFTER <span>fault disabled</span>
              </th>
              <th>Relative change</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => {
              const before = experiment.before?.[row.key];
              const after = experiment.after?.[row.key];
              const delta = change(before, after);
              const better =
                before != null &&
                after != null &&
                (row.lowerBetter ? after < before : after > before);
              const worse =
                before != null &&
                after != null &&
                (row.lowerBetter ? after > before : after < before);
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{experiment.before ? row.format(before) : "Pending"}</td>
                  <td>{experiment.after ? row.format(after) : "Pending"}</td>
                  <td
                    className={
                      delta !== "—" && better
                        ? "delta-better"
                        : delta !== "—" && worse
                          ? "delta-worse"
                          : ""
                    }
                  >
                    {delta}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="panel-footer">
        <span>
          Single-run comparison; differences are measured observations, not
          statistical guarantees. “Unavailable” means the source did not provide
          a value.
        </span>
      </div>
    </section>
  );
}
