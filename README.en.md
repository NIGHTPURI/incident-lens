# IncidentLens

[한국어](README.md) · [English](README.en.md)

IncidentLens is a local backend learning lab. Follow a request and its data through real code, predict what a fault will change, run a scoped experiment, inspect evidence, remove the fault, and compare recovery. The lessons work without services; measurements require the local stack. There is no account or paid API requirement.

The unified home opens **Backend Learning, Free lab and Technology guides**. All four languages share introduction → Start learning → 15-stage lessons. Changing language returns to its introduction; Continue learning restores that language’s last stage. The logo opens unified home; a separate learning-home control opens the introduction. A sun/moon button toggles a persistent light/dark theme.

![English unified landing](apps/web/screenshots/pc-setup-en-landing.png)
![English learning introduction and shared contents](apps/web/screenshots/pc-setup-en-learning.png)
![English free lab](apps/web/screenshots/pc-setup-en-lab.png)

These are new, actual English browser captures of this code (1440×1000, light theme, Windows/PowerShell, Java selected). The saved local test session is a real record; screenshots are not new workload measurements or performance comparisons. Older UI captures are not reused as new results.

## Learning path

1. **Request and response:** HTTP/API and Spring Boot accept, validate and answer requests. An order response does not mean the worker has finished.
2. **Database and transactions:** MySQL persists orders. A transaction saves the order and outbox event together.
3. **Cache:** Redis serves repeated catalog reads; learn hits, misses, fallback and explicit bypass.
4. **Asynchronous work:** Kafka separates intake from the demo worker. Docker runs isolated components and k6 reproduces a specified workload.
5. **Outbox and deduplication:** the relay publishes after the DB commit; Kafka acknowledgement can precede a failed outbox update, so duplicate delivery remains possible. The worker deduplicates the event effect. This is not an end-to-end exactly-once guarantee.
6. **Diagnosis and recovery:** metrics show trends, logs record events, traces show spans, and RCA separates observations from hypotheses. The rule-based report is the default; a compatible LLM is optional.

Each technology explains the problem, an analogy, actual behavior, why it was chosen, its alternatives, failure symptoms, and the relevant code. Select a node or arrow in either flow to inspect its role and failure boundary. The IncidentLens logo returns to unified home; the separate learning-home control opens its introduction; **Continue learning** restores the last lesson. Predictions, selected scenario and session, and the home/lesson view persist across refreshes. The right panel contains written hints, not an AI chat.

## System flow

```mermaid
flowchart LR
  Browser -->|GET /api/catalog| API[Spring demo-api]
  API -->|hit / miss| Redis
  API -->|miss / bypass| Catalog[(MySQL catalog)]
  Browser -->|POST /api/orders + Idempotency-Key| API
  API -->|one transaction| Orders[(MySQL order + outbox)]
  Orders --> Relay[Outbox relay]
  Relay --> Kafka
  Kafka --> Worker[demo-worker]
  Worker --> WorkerDB[(MySQL processing record)]
  Web[React learning lab] --> Control[control-plane]
  Control -->|scoped fault, evidence, experiment, RCA| API
  Control --> Worker
```

The worker demonstrates follow-up processing; it does **not** charge a card or arrange shipping. A single local MySQL instance hosts separate service databases. Faults are scoped to an incident ID, one is active at a time, and they expire after 15 minutes. [Architecture and failure boundaries](ARCHITECTURE.md) · [API reference](docs/API.md).


## PC-specific execution setup

The [PC setup screen](http://localhost:3000/?view=settings) saves a browser-only plan. Choosing options does not modify Docker, `.env` or workload. Apply commands yourself. Resolve conflicts through host-port settings rather than stopping unrelated processes.

| Mode | Required components | Limits |
|---|---|---|
| Learning only | Node.js 22+, web development server | Lessons, guides and browser notes; experiment API blocked, no faults, evidence, RCA or k6 comparison |
| Core lab | Docker/Compose; web, control-plane, demo-api, demo-worker, MySQL, Redis, Kafka | Scoped faults, in-process telemetry, free rule RCA; terminal k6 comparison; no searchable logs, traces or Grafana |
| With observability | Core seven plus Prometheus, Grafana, Loki, Tempo, Collector | Extra dashboards, logs and traces; additional memory, disk and startup time |

Run learning only without stopping existing Docker services:

```bash
cd apps/web
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --mode learning
```

Open `http://127.0.0.1:5173`. This mode blocks the experiment API proxy. Confirm missing-tool installation or administrator/security changes before applying them; on Windows, check Docker Desktop integration for the current WSL distribution.

Copy `.env.example` only if `.env` does not already exist. All host bindings remain on `127.0.0.1`:

| Variable | Default host port | Fixed container port |
|---|---:|---:|
| `CONTROL_PLANE_PORT` | 8080 | 8080 |
| `DEMO_API_PORT` | 8081 | 8081 |
| `DEMO_WORKER_PORT` | 8082 | 8082 |
| `WEB_PORT` | 3000 | 8080 |
| `PROMETHEUS_PORT` | 9090 | 9090 |
| `GRAFANA_PORT` | 3001 | 3000 |

For example, `CONTROL_PLANE_PORT=18080` leaves internal `control-plane:8080` and `demo-api:8081` addresses unchanged. `bash scripts/dev-status.sh` or `./scripts/dev-status.ps1` uses actual bindings for status and URLs; Vite reads `CONTROL_PLANE_PORT` from repository `.env`. Apply changed ports/environment with `dev-up` to recreate affected containers. `docker compose restart` alone does not reread `.env`. Reducing profiles does not automatically delete existing observability containers.

Default load is **2 VUs for 10 seconds per phase**; allowed values are 1–50 VUs and 5–300 seconds. Begin small and inspect errors, backlog and `docker stats`. Allowed maxima do not guarantee PC capacity. [PC setup guidance](docs/PC_SETUP.md) lists fixed memory caps and resource commands. Roughly 6/8 GB available to Docker are planning estimates, not measured minimum specifications or verified low-spec operation.

The runner verifies a local Docker context, actual bindings, responding instance and matching internal fault/k6 targets before creating sessions, setting faults or starting load. Changing only `CONTROL_URL` cannot enable remote experiments. New comparisons store configuration, load, controlled-run windows and measured elapsed seconds. Missing historical values are never backfilled. Different PCs are not equivalent benchmark conditions.

## Run locally

Requires Docker Engine/Desktop with Compose. From the repository root:

```bash
bash scripts/dev-up.sh
```

Open **http://localhost:3000** (or `WEB_PORT` from your local `.env`). Read a lesson, write a prediction, select one of the four faults, and create a session. The site shows service connectivity before enabling controls. `bash scripts/dev-down.sh` preserves named volumes. The first build downloads images and dependencies. For traces, searchable logs and Grafana, start with `bash scripts/dev-up.sh --observability`; these tools are optional for the core lesson.

For frontend development while the backend stack is running:

```bash
cd apps/web
npm ci
npm run dev
```

Open **http://localhost:5173**. `INCIDENTLENS_API_TARGET=http://127.0.0.1:18080 npm run dev` can point Vite's `/api` proxy at a different local control-plane port. With no backend, the lessons still render and the experiment controls explain that results are unavailable. `?view=lab` opens the existing expert incident lab directly. `?embed=1` hides IncidentLens navigation so a host menu can frame the module.

## Four controlled faults

| Fault | Scoped change | Evidence to check |
|---|---|---|
| Downstream delay | Delays a simulated inventory lookup during catalog reads; above 1,500 ms it times out | Request p95, timeout event, inventory span |
| Database degradation | Uses a less efficient catalog query **and bypasses cache** | DB query duration, logical DB loads, request p95 |
| Worker slowdown | Delays each order event before the worker transaction | Kafka consumer lag, processing events, retries |
| Cache bypass | Skips Redis reads and request coalescing for catalog lists | Cache hit rate, DB loads, request p95 |

The browser can create a session, enable/disable its fault, collect evidence, request RCA and prepare an experiment. **k6 runs in a terminal, never in the browser.** For a complete measured BEFORE/AFTER cycle, use the displayed command or, for example:

```bash
SCENARIO=CACHE_DEGRADATION VUS=2 DURATION_SECONDS=10 bash scripts/demo-compare.sh
```

The Bash runner requires `curl`, `jq` and Docker. It checks service health and an idle backlog, runs BEFORE with the fault active, generates RCA, disables the fault, then runs the same workload for AFTER. It has a cleanup trap. A PowerShell equivalent is `./scripts/demo-compare.ps1 -Scenario CACHE_DEGRADATION -Vus 2 -DurationSeconds 10`. Check the saved experiment in the **Experiments** view and the report in **Evidence & RCA** after refreshing. Never treat absent telemetry as zero or as proof of health. Compare workload settings, cache warmth, backlog and other traffic before attributing a change to one cause; the DB fault also bypasses cache.

## Language and evidence

Use **한국어 / English** in the header. Both languages cover lessons, diagrams, questions, hints, controls, errors and the existing dashboard. Switching languages keeps the lesson, inputs and selected experiment. Raw logs, source code, and previously generated RCA reports keep their original language; changing the UI does not translate them. Saved evidence carries its source, window, value and unit when available. RCA reports separate the observed evidence IDs, suspected cause, impact, actions and uncertainties. The optional compatible LLM response is limited to **65,536 bytes while receiving**; oversized or timed-out requests are cancelled and the rule-based report remains available. [HTTP boundary verification](docs/RCA_HTTP_VERIFICATION_2026-10-03.md).

## Verification and limits

The redesigned UI is covered by TypeScript/build, Vitest, and Playwright checks for lesson navigation, language persistence, desktop/mobile layout, keyboard controls, disconnected state and explicit fault actions. Java tests cover request, persistence and RCA boundaries. Current run details and limits: [final UI and PC setup verification](docs/VALIDATION_20261006_UI.md). Earlier measured experiments remain dated evidence: [2026-10-01 publication audit](docs/PUBLICATION_AUDIT_2026-10-01.md) and [2026-10-03 RCA live verification](docs/RCA_LIVE_VERIFICATION_2026-10-03.md). Screenshots are local UI captures; browser fixture tests are not benchmark data.

The lab is a teaching service, not a production load or reliability claim. Shared lag gauges may include unrelated traffic; sampling windows and cache temperature can change comparisons. The optional Grafana/Tempo/Loki stack adds detail but does not replace checking the core evidence. The demo worker has no real payment or shipping integration.

## Project map

`apps/demo-api` contains catalog, orders and outbox; `apps/demo-worker` consumes events; `apps/control-plane` owns sessions, faults, evidence, comparisons and RCA; `apps/web` is the learning UI and expert dashboard. `loadtest/` holds k6 workloads, `scripts/` local runners, `infra/` container configuration, and `docs/` design and verification records. See [web development notes](apps/web/README.md) and [operations](docs/OPERATIONS.md) if present.

## Backend Learning completion

The left curriculum (mobile drawer) covers Java, Python, JavaScript/TypeScript and C#. Each path connects language basics, HTTP/API, durable transactions, identity/access, tests, operations, caching, duplicate handling, async work and recovery. Runnable intro/advanced projects and fixed dependencies are in [language paths](examples/language-paths/README.md); compiled TypeScript runs from `advanced/javascript/server.mts`. [Outcome map](docs/BACKEND_LANGUAGE_PARITY.md) and [actual validation](docs/VALIDATION_20261005.md) distinguish authored content, execution and remaining limits.

Learning progress, language/OS/theme and self-review persist independently. Learning and free-lab session selections have separate storage keys; route history works through back/refresh. Navigation does not enable/disable faults or regenerate reports. Actual active faults retain their global warning. RCA selects BEFORE rows before limiting to 500, while general evidence still displays AFTER; report citations are restored within their session.

Local preview: `cd apps/web && npm ci && npm run dev -- --host 127.0.0.1 --port 5173`, then open `http://127.0.0.1:5173`. Choose UI language, OS and programming language; start the first lesson, record practice evidence, visit the technology guide, then explicitly enter the free lab when ready. Its backend proxy defaults to `http://127.0.0.1:8080`; reading lessons works while the lab is offline. Existing local Docker data need not be changed to read or test lessons.

Prior-PC deployment and database recovery records are dated evidence, not current-PC ports or history: [deployment record](docs/MAIN_LOCAL_DEPLOYMENT_20261006.md), [recovery record](docs/LOCAL_BACKEND_RECOVERY_20261006.md).
