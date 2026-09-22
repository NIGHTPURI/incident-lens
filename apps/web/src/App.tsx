import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError } from "./api";
import * as format from "./format";
import { useI18n } from "./i18n/I18nProvider";
import type { TranslationKey } from "./i18n/translations";
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
  title: TranslationKey;
  description: TranslationKey;
  symbol: string;
  parameter: TranslationKey;
  defaultParameter: number;
}[] = [
  {
    value: "DOWNSTREAM_LATENCY",
    title: "scenario.downstream.title",
    description: "scenario.downstream.description",
    symbol: "01",
    parameter: "scenario.downstream.parameter",
    defaultParameter: 350,
  },
  {
    value: "DATABASE_DEGRADATION",
    title: "scenario.database.title",
    description: "scenario.database.description",
    symbol: "02",
    parameter: "scenario.parameter",
    defaultParameter: 0,
  },
  {
    value: "KAFKA_SLOWDOWN",
    title: "scenario.kafka.title",
    description: "scenario.kafka.description",
    symbol: "03",
    parameter: "scenario.kafka.parameter",
    defaultParameter: 500,
  },
  {
    value: "CACHE_DEGRADATION",
    title: "scenario.cache.title",
    description: "scenario.cache.description",
    symbol: "04",
    parameter: "scenario.parameter",
    defaultParameter: 0,
  },
];

type Page = "overview" | "lab" | "evidence" | "comparison";
const pages: { id: Page; label: TranslationKey; symbol: string }[] = [
  { id: "overview", label: "nav.overview", symbol: "◫" },
  { id: "lab", label: "nav.lab", symbol: "⌁" },
  { id: "evidence", label: "nav.evidence", symbol: "≡" },
  { id: "comparison", label: "nav.comparison", symbol: "⇄" },
];

type Translator = ReturnType<typeof useI18n>["t"];
type DisplayError = { cause: unknown; fallback: TranslationKey };

function scenarioName(value: Scenario, t: Translator) {
  const scenario = scenarios.find((s) => s.value === value);
  return scenario ? t(scenario.title) : value;
}

function usePresentation() {
  const context = useI18n();
  return {
    ...context,
    scenarioName: (value: Scenario) => scenarioName(value, context.t),
    number: (value: number | null | undefined, digits = 0) =>
      format.number(value, digits, context.locale),
    percent: (value: number | null | undefined) =>
      format.percent(value, context.locale),
    milliseconds: (value: number | null | undefined) =>
      format.milliseconds(value, context.locale),
    date: (value: string | null | undefined) =>
      format.date(value, context.locale),
    change: (
      before: number | null | undefined,
      after: number | null | undefined,
    ) => format.change(before, after, context.locale),
  };
}

function errorText(error: DisplayError, t: Translator) {
  if (error.cause instanceof ApiError) {
    return error.cause.detail
      ? `${t("error.serverDetail")} ${error.cause.detail}`
      : t("error.http", { status: error.cause.status });
  }
  if (error.cause instanceof TypeError) return t("error.network");
  if (error.cause instanceof SyntaxError) return t("error.invalidResponse");
  if (
    error.cause instanceof DOMException &&
    error.cause.name === "TimeoutError"
  ) {
    return t("error.timeout");
  }
  return t(error.fallback);
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
const statusKeys: Record<string, TranslationKey> = {
  UP: "status.up",
  DOWN: "status.down",
  HEALTHY: "status.healthy",
  UNHEALTHY: "status.unhealthy",
  UNKNOWN: "status.unknown",
  UNAVAILABLE: "status.unavailable",
  COMPLETED: "status.completed",
  COMPLETE: "status.complete",
  DISABLED: "status.disabled",
  ENABLED: "status.enabled",
  CREATED: "status.created",
  ACTIVE: "status.active",
  OPEN: "status.open",
  INVESTIGATING: "status.investigating",
  RESOLVED: "status.resolved",
  BEFORE_RUNNING: "status.beforeRunning",
  BEFORE_COMPLETE: "status.beforeComplete",
  AFTER_RUNNING: "status.afterRunning",
  ABORTED: "status.aborted",
  FAULT_ACTIVE: "status.faultActive",
  FAULT_DISABLED: "status.faultDisabled",
};
const phaseKeys: Record<string, TranslationKey> = {
  BEFORE: "phase.before",
  AFTER: "phase.after",
  FAULT: "phase.fault",
  NONE: "phase.none",
  ALL: "phase.all",
};

function Status({ value }: { value: string }) {
  const { t } = useI18n();
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
      {statusKeys[value.toUpperCase()]
        ? t(statusKeys[value.toUpperCase()])
        : value}
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
  const { t } = useI18n();
  return (
    <article className="stat">
      <span className="eyebrow">{label}</span>
      <strong
        className={value === t("common.unavailable") ? "unavailable" : ""}
      >
        {value}
      </strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

export default function App() {
  const {
    t,
    locale,
    setLocale,
    number,
    percent,
    milliseconds,
    date,
    scenarioName,
  } = usePresentation();
  const [page, setPage] = useState<Page>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sessions, setSessions] = useState<IncidentSession[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<DisplayError | null>(null);
  const [notice, setNotice] = useState<TranslationKey | "">("");
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
      setError(null);
    } catch (cause) {
      setError({ cause, fallback: "error.controlPlane" });
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
        if (alive) setError({ cause, fallback: "error.incident" });
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

  async function action(
    operation: () => Promise<unknown>,
    success: TranslationKey,
  ) {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await operation();
      await refresh();
      if (selectedId) setDetail(await api.session(selectedId));
      setNotice(success);
    } catch (cause) {
      setError({ cause, fallback: "error.operation" });
    } finally {
      setBusy(false);
    }
  }

  async function createSession(name: string, scenario: Scenario) {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const created = await api.createSession(name, scenario);
      await refresh();
      setSelectedId(created.id);
      setNotice("notice.sessionCreated");
    } catch (cause) {
      setError({ cause, fallback: "error.createSession" });
    } finally {
      setBusy(false);
    }
  }

  const active = overview?.activeFault?.enabled ? overview.activeFault : null;
  const selection = (
    <label className="session-select">
      <span>{t("common.incidentSession")}</span>
      <select
        aria-label={t("common.incidentSession")}
        disabled={busy}
        value={selectedId}
        onChange={(event) => {
          setSelectedId(event.target.value);
          setNotice("");
        }}
      >
        {sessions.length === 0 && (
          <option value="">{t("common.noSessions")}</option>
        )}
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
          aria-label={t("shell.home")}
        >
          <span className="brand-mark">iL</span>
          <span>
            Incident<span className="brand-light">Lens</span>
            <small>{t("shell.engineeringWorkspace")}</small>
          </span>
        </a>
        <span className="nav-label">{t("shell.workspace").toUpperCase()}</span>
        <nav aria-label={t("shell.navigation")}>
          {pages.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "selected" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => setPage(item.id)}
            >
              <span aria-hidden="true">{item.symbol}</span>
              {t(item.label)}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <strong>{t("shell.localLab")}</strong>
          <p>
            {t("shell.controlledFailures")}
            <br />
            {t("shell.observableConsequences")}
            <br />
            {t("shell.evidenceFirst")}
          </p>
        </div>
        <div className="sidebar-footer">
          {t("shell.technologies")}
          <span>{t("shell.evidenceGrounded")}</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <span className="breadcrumb">
            {t("shell.workspace")}
            <span>/</span> {t(currentPage.label)}
          </span>
          <div className="topbar-right">
            <select
              className="language-select"
              aria-label={t("language.label")}
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value === "en" ? "en" : "ko")
              }
            >
              <option value="ko">{t("language.korean")}</option>
              <option value="en">{t("language.english")}</option>
            </select>
            <span className="local-tag">{t("shell.localEnvironment")}</span>
            <button
              className="button ghost compact"
              onClick={() => {
                void refresh();
              }}
              disabled={busy || loading}
              aria-label={t("shell.refreshLabel")}
            >
              {t("shell.refresh")}
            </button>
          </div>
        </header>
        <div className="page-content">
          {active && (
            <div className="fault-banner" role="status">
              <span className="warning-icon">!</span>
              <div>
                <strong>
                  {t("fault.activeWarning", {
                    scenario: scenarioName(active.scenario),
                  })}
                </strong>
                <span>
                  {t("fault.expires", {
                    date: date(active.expiresAt),
                    session: active.sessionId.slice(0, 8),
                  })}
                </span>
              </div>
              <button
                className="button warning"
                disabled={busy}
                onClick={() => {
                  void action(
                    () =>
                      api.setFault(active.sessionId, false, active.parameter),
                    "notice.faultDisabledRecovery",
                  );
                }}
              >
                {t("fault.disable")}
              </button>
            </div>
          )}
          {error && (
            <div className="message error" role="alert">
              <strong>{t("error.heading")}</strong> {errorText(error, t)}{" "}
              <span>{t("error.help")}</span>
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              {t(notice)}
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                INCIDENTLENS / {t(currentPage.label).toUpperCase()}
              </span>
              <h1>
                {page === "overview"
                  ? t("overview.title")
                  : page === "lab"
                    ? t("lab.title")
                    : page === "evidence"
                      ? t("evidence.title")
                      : t("experiment.title")}
              </h1>
              <p>
                {page === "overview"
                  ? t("overview.description")
                  : page === "lab"
                    ? t("lab.description")
                    : page === "evidence"
                      ? t("evidence.description")
                      : t("experiment.description")}
              </p>
            </div>
            <span className="last-updated">
              {loading
                ? t("shell.connecting")
                : updatedAt
                  ? t("shell.updated", { date: date(updatedAt) })
                  : t("shell.waitingTelemetry")}
            </span>
          </div>

          {page === "overview" && (
            <>
              <div className="stats-grid">
                <Stat
                  label={t("metric.requestCount")}
                  value={number(overview?.metrics.requestCount)}
                  detail={t("overview.requestCountDetail")}
                />
                <Stat
                  label={t("metric.requestErrorRate")}
                  value={percent(
                    overview?.metrics.requestCount &&
                      overview.metrics.errorCount != null
                      ? overview.metrics.errorCount /
                          overview.metrics.requestCount
                      : null,
                  )}
                  detail={t("overview.errorCountDetail", {
                    count: number(overview?.metrics.errorCount),
                  })}
                />
                <Stat
                  label={t("metric.sampledP95")}
                  value={milliseconds(overview?.metrics.p95Ms)}
                  detail={t("overview.latencyDetail")}
                />
                <Stat
                  label={t("metric.consumerLag")}
                  value={number(overview?.metrics.kafkaLag)}
                  detail={t("overview.lagDetail")}
                />
              </div>
              <p className="telemetry-scope">{t("overview.telemetryScope")}</p>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <span className="eyebrow">{t("overview.runtime")}</span>
                      <h2>{t("overview.connectivity")}</h2>
                    </div>
                    <span className="tag">{t("overview.endpointChecks")}</span>
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
                                ? t("overview.redisConnectivity")
                                : service.name === "control-plane"
                                  ? t("overview.controlPlaneConnectivity")
                                  : t("overview.telemetryConnectivity")}
                            </span>
                          </div>
                          <Status value={service.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title={t("overview.noHealthTitle")}>
                      {t("overview.noHealthDescription")}
                    </Empty>
                  )}
                  <div className="panel-footer">
                    <span>{t("metric.cacheHitRate")}</span>
                    <strong>{percent(overview?.metrics.cacheHitRate)}</strong>
                  </div>
                </section>
                <section className="panel workflow">
                  <span className="eyebrow">
                    {t("overview.experimentLoop")}
                  </span>
                  <h2>{t("overview.hypothesis")}</h2>
                  <p>{t("overview.hypothesisDescription")}</p>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>{t("overview.inject")}</strong>
                        <p>{t("overview.injectDescription")}</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>{t("overview.collect")}</strong>
                        <p>{t("overview.collectDescription")}</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>{t("overview.recover")}</strong>
                        <p>{t("overview.recoverDescription")}</p>
                      </div>
                    </li>
                  </ol>
                  <button
                    className="button primary"
                    onClick={() => setPage("lab")}
                  >
                    {t("overview.openLab")}
                    <span>→</span>
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">
                      {t("overview.investigations")}
                    </span>
                    <h2>{t("overview.recentSessions")}</h2>
                  </div>
                  <button
                    className="button ghost compact"
                    onClick={() => setPage("lab")}
                  >
                    {t("overview.newSession")}
                  </button>
                </div>
                {sessions.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("common.session")}</th>
                          <th>{t("common.scenario")}</th>
                          <th>{t("common.status")}</th>
                          <th>{t("common.created")}</th>
                          <th>
                            <span className="sr-only">{t("common.open")}</span>
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
                                {t("common.inspect")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title={t("overview.emptyTitle")}>
                    {t("overview.emptyDescription")}
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
                    <span className="eyebrow">{t("lab.faultControl")}</span>
                    <h2>{t("lab.selectedIncident")}</h2>
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
                          ? "notice.faultEnabled"
                          : "notice.faultDisabledWorkload",
                      );
                    }}
                  />
                ) : (
                  <Empty
                    title={
                      selectedId
                        ? t("common.loadingIncident")
                        : t("lab.startTitle")
                    }
                  >
                    {t("lab.sessionDescription")}
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
                    {t("evidence.phase")}
                    <select
                      value={collectionPhase}
                      onChange={(event) =>
                        setCollectionPhase(
                          event.target.value as "BEFORE" | "AFTER",
                        )
                      }
                    >
                      <option value="BEFORE">{t("phase.beforeActive")}</option>
                      <option value="AFTER">{t("phase.afterDisabled")}</option>
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    disabled={!detail || busy}
                    onClick={() => {
                      void action(
                        () => api.collect(selectedId, collectionPhase),
                        "notice.evidenceCollected",
                      );
                    }}
                  >
                    {t("evidence.collect")}
                  </button>
                  <button
                    className="button primary"
                    disabled={!detail || busy}
                    onClick={() => {
                      void action(
                        () => api.analyze(selectedId),
                        "notice.rcaGenerated",
                      );
                    }}
                  >
                    {busy ? t("common.working") : t("evidence.generateRca")}
                  </button>
                </div>
              </div>
              {detail ? (
                <>
                  <div className="evidence-layout">
                    <section className="panel">
                      <div className="panel-header">
                        <div>
                          <span className="eyebrow">
                            {t("evidence.observed")}
                          </span>
                          <h2>{t("evidence.signals")}</h2>
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
                        <Empty title={t("evidence.emptyTitle")}>
                          {t("evidence.emptyDescription")}
                        </Empty>
                      )}
                    </section>
                    <section className="panel timeline-panel">
                      <div className="panel-header">
                        <div>
                          <span className="eyebrow">
                            {t("timeline.history")}
                          </span>
                          <h2>{t("timeline.title")}</h2>
                        </div>
                      </div>
                      <ol className="timeline">
                        <li>
                          <span className="timeline-point" />
                          <strong>{t("timeline.sessionCreated")}</strong>
                          <time>{date(detail.session.createdAt)}</time>
                          <p>{scenarioName(detail.session.scenario)}</p>
                        </li>
                        {detail.activations.map((activation, index) => (
                          <li key={`${activation.occurredAt}-${index}`}>
                            <span
                              className={`timeline-point ${activation.enabled ? "orange" : ""}`}
                            />
                            <strong>
                              {t(
                                activation.enabled
                                  ? "fault.enabled"
                                  : "fault.disabled",
                              )}
                            </strong>
                            <time>{date(activation.occurredAt)}</time>
                            <p>
                              {t("common.parameter", {
                                value: number(activation.parameter),
                              })}
                            </p>
                          </li>
                        ))}
                        {detail.report && (
                          <li>
                            <span className="timeline-point" />
                            <strong>{t("timeline.rcaGenerated")}</strong>
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
                        ? t("common.loadingIncident")
                        : t("common.selectSession")
                    }
                  >
                    {t("evidence.selectDescription")}
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
                        "notice.experimentCreated",
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
                      <Empty title={t("experiment.emptyTitle")}>
                        {t("experiment.emptyDescription")}
                      </Empty>
                    </section>
                  )}
                </>
              ) : (
                <section className="panel">
                  <Empty title={t("common.selectSession")}>
                    {t("experiment.selectDescription")}
                  </Empty>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>IncidentLens</span>
            {t("shell.footer")}
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
  const { t, scenarioName } = usePresentation();
  const [scenario, setScenario] = useState<Scenario>("DOWNSTREAM_LATENCY");
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void createSession(
      name.trim() ||
        t("lab.defaultSessionName", { scenario: scenarioName(scenario) }),
      scenario,
    );
  };
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t("lab.createInvestigation")}</span>
          <h2>{t("lab.chooseScenario")}</h2>
        </div>
        <span className="tag">{t("lab.scenarioCount")}</span>
      </div>
      <form onSubmit={submit}>
        <fieldset className="scenario-grid">
          <legend className="sr-only">{t("lab.failureScenario")}</legend>
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
              <strong>{t(item.title)}</strong>
              <span>{t(item.description)}</span>
            </label>
          ))}
        </fieldset>
        <div className="create-session-row">
          <label>
            {t("lab.sessionName")}
            <input
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("lab.defaultSessionName", {
                scenario: scenarioName(scenario),
              })}
            />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            {t("lab.createSession")}
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
  const { t } = useI18n();
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
        <p>{t(scenario.description)}</p>
        <span className="mono muted">{detail.session.id}</span>
        {conflicting && <p className="warning-text">{t("fault.conflict")}</p>}
      </div>
      <div className="fault-actions">
        {usesParameter && (
          <label>
            {t(scenario.parameter)}
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
          {active ? t("fault.disable") : t("fault.enable")}
        </button>
        <span className="muted">{t("fault.expiryHelp")}</span>
      </div>
    </div>
  );
}

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const { t, number, date } = usePresentation();
  return (
    <article className="evidence-card" id={`evidence-${evidence.id}`}>
      <div className="evidence-title">
        <span className="tag">{evidence.service}</span>
        {evidence.phase && (
          <span className="tag">
            {phaseKeys[evidence.phase]
              ? t(phaseKeys[evidence.phase])
              : evidence.phase}
          </span>
        )}
        <strong>
          {number(evidence.value, 3)}{" "}
          {evidence.value == null ? "" : evidence.unit}
        </strong>
      </div>
      <h3>{evidence.type.replaceAll("_", " ").toLowerCase()}</h3>
      <p>{evidence.explanation}</p>
      <dl>
        <div>
          <dt>{t("evidence.source")}</dt>
          <dd>{evidence.source}</dd>
        </div>
        <div>
          <dt>{t("evidence.window")}</dt>
          <dd>
            {date(evidence.windowStart)} — {date(evidence.windowEnd)}
          </dd>
        </div>
        <div>
          <dt>{t("evidence.id")}</dt>
          <dd className="mono">{evidence.id}</dd>
        </div>
        {evidence.traceId && (
          <div>
            <dt>{t("common.traceId")}</dt>
            <dd className="mono">{evidence.traceId}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function RcaReport({ report }: { report: Report | null }) {
  const { t, percent, date } = usePresentation();
  return (
    <section className="panel rca-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t("rca.analysis")}</span>
          <h2>{t("rca.title")}</h2>
        </div>
        {report && <span className="tag">{report.provider}</span>}
      </div>
      {report ? (
        <div className="rca-content">
          <p className="report-summary">{report.summary}</p>
          <div className="hypothesis">
            <div>
              <span className="eyebrow">{t("rca.hypothesis")}</span>
              <h3>{report.suspectedRootCause}</h3>
            </div>
            <div className="confidence">
              <strong>{percent(report.confidence)}</strong>
              <span>{t("rca.confidence")}</span>
            </div>
          </div>
          <div className="report-citations">
            <strong>{t("rca.supportingEvidence")}</strong>
            {report.evidenceIds.map((id) => (
              <a key={id} className="citation mono" href={`#evidence-${id}`}>
                {id.slice(0, 12)} ↗
              </a>
            ))}
          </div>
          <div className="report-grid">
            <div>
              <h3>{t("rca.impact")}</h3>
              <p>{report.impact}</p>
              <h3>{t("rca.actions")}</h3>
              <ul>
                {report.recommendedActions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
            <div className="uncertainties">
              <h3>{t("rca.uncertainties")}</h3>
              <ul>
                {report.uncertainties.map((uncertainty, i) => (
                  <li key={i}>{uncertainty}</li>
                ))}
              </ul>
              <p>{t("rca.confidenceHelp")}</p>
            </div>
          </div>
          <span className="muted">
            {t("rca.generated", { date: date(report.generatedAt) })}
          </span>
        </div>
      ) : (
        <Empty title={t("rca.emptyTitle")}>{t("rca.emptyDescription")}</Empty>
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
  const { t, scenarioName } = usePresentation();
  const [vus, setVus] = useState(2);
  const [duration, setDuration] = useState(20);
  if (detail.experiments.length > 0)
    return (
      <div className="experiment-guidance">{t("experiment.existing")}</div>
    );
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t("experiment.repeatable")}</span>
          <h2>{t("experiment.prepare")}</h2>
        </div>
        <span className="tag">{scenarioName(detail.session.scenario)}</span>
      </div>
      <div className="experiment-setup">
        <p>
          {t("experiment.prepareHelp")
            .split(/(BEFORE|AFTER)/)
            .map((part, index) =>
              part === "BEFORE" || part === "AFTER" ? (
                <strong key={index}>{part}</strong>
              ) : (
                part
              ),
            )}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create({ vus, durationSeconds: duration });
          }}
        >
          <label>
            {t("experiment.virtualUsers")}
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
            {t("experiment.duration")}
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
            {t("experiment.create")}
          </button>
        </form>
      </div>
    </section>
  );
}

export function ExperimentCard({
  experiment,
  scenario,
  parameter = 400,
}: {
  experiment: Experiment;
  scenario: Scenario;
  parameter?: number;
}) {
  const { t, number, percent, milliseconds, date, change } = usePresentation();
  const comparisonRows: {
    key: keyof Metrics;
    label: TranslationKey;
    format: (value: number | null | undefined) => string;
    lowerBetter: boolean;
  }[] = [
    {
      key: "requestCount",
      label: "metric.requests",
      format: number,
      lowerBetter: false,
    },
    {
      key: "throughput",
      label: "metric.throughput",
      format: (value) => number(value, 2),
      lowerBetter: false,
    },
    {
      key: "successRate",
      label: "metric.successRate",
      format: percent,
      lowerBetter: false,
    },
    {
      key: "p50Ms",
      label: "metric.p50",
      format: milliseconds,
      lowerBetter: true,
    },
    {
      key: "p95Ms",
      label: "metric.p95",
      format: milliseconds,
      lowerBetter: true,
    },
    {
      key: "p99Ms",
      label: "metric.p99",
      format: milliseconds,
      lowerBetter: true,
    },
    {
      key: "dbQueryP95Ms",
      label: "metric.dbP95",
      format: milliseconds,
      lowerBetter: true,
    },
    {
      key: "kafkaLag",
      label: "metric.consumerLagEvents",
      format: number,
      lowerBetter: true,
    },
    {
      key: "cacheHitRate",
      label: "metric.cacheHitRate",
      format: percent,
      lowerBetter: false,
    },
    {
      key: "errorCount",
      label: "metric.errors",
      format: number,
      lowerBetter: true,
    },
  ];

  const [copied, setCopied] = useState(false);
  const command = `.\\scripts\\demo-compare.ps1 -Scenario ${scenario} -SessionId ${experiment.sessionId} -ExperimentId ${experiment.id} -Vus ${experiment.workload.vus} -DurationSeconds ${experiment.workload.durationSeconds} -Parameter ${parameter}`;
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t("experiment.comparison")}</span>
          <h2>
            {t("experiment.name")}{" "}
            <span className="mono small">{experiment.id.slice(0, 8)}</span>
          </h2>
        </div>
        <Status value={experiment.status} />
      </div>
      <div className="experiment-meta">
        <span>
          {t("experiment.usersSummary", {
            count: number(experiment.workload.vus),
          })}
        </span>
        <span>
          {t("experiment.durationSummary", {
            seconds: number(experiment.workload.durationSeconds),
          })}
        </span>
        <span>
          {t("experiment.created", { date: date(experiment.createdAt) })}
        </span>
      </div>
      {experiment.status === "CREATED" && (
        <div className="command-panel">
          <div>
            <strong>{t("experiment.runCommand")}</strong>
            <button
              className="text-button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(command)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? t("experiment.copied") : t("experiment.copy")}
            </button>
          </div>
          <pre>
            <code>{command}</code>
          </pre>
          <p>{t("experiment.runnerHelp")}</p>
        </div>
      )}
      {experiment.status.endsWith("_RUNNING") && (
        <div className="experiment-guidance" role="status">
          {t("experiment.runningHelp")}
        </div>
      )}
      {experiment.status === "BEFORE_COMPLETE" && (
        <div className="experiment-guidance">
          {t("experiment.beforeCompleteHelp")}
        </div>
      )}
      {experiment.status === "ABORTED" && (
        <div className="experiment-guidance">{t("experiment.abortedHelp")}</div>
      )}
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>{t("experiment.measurement")}</th>
              <th>
                {t("phase.before")}
                <span>{t("phase.faultActive")}</span>
              </th>
              <th>
                {t("phase.after")}
                <span>{t("phase.faultDisabled")}</span>
              </th>
              <th>{t("experiment.relativeChange")}</th>
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
                  <td>{t(row.label)}</td>
                  <td>
                    {experiment.before
                      ? row.format(before)
                      : t("common.pending")}
                  </td>
                  <td>
                    {experiment.after ? row.format(after) : t("common.pending")}
                  </td>
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
        <span>{t("experiment.comparisonHelp")}</span>
      </div>
    </section>
  );
}
