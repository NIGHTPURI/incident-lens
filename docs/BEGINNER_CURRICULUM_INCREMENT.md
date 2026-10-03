# Beginner curriculum: implementation record


## Final verification for the full curriculum

- Frontend: **47 tests passed**; TypeScript `--noEmit` passed.
- Full Playwright suite: **36 passed** across desktop/laptop/mobile. New coverage
  walks all 15 stages in both languages, checking scope, examples, diagnosis,
  independent criteria and no implicit read/mastery credit. APIs are fixtures;
  no real experiment/fault/report was generated.
- Eleven stage-5–15 Java programs passed with installed Java and cached H2.
  Targeted 14/15 checks passed again after retry/DLQ and bounded-output refinements.
- Actual JPA/H2 tests: **3 passed**, including observed N+1 vs fetch-join SQL counts.
- Earlier unchanged foundation evidence remains: 4 Spring MockMvc/Service tests,
  7 Java execution cases and 8 real toy-HTTP cases passed.
- Production build succeeded in `/tmp/incidentlens-full-curriculum-build`, away
  from live assets. Vite warns that the single JS chunk is about **531 kB minified /
  172 kB gzip**, now containing the full bilingual curriculum. Lazy-loading lesson
  content is a possible follow-up; the warning is not suppressed or a test failure.
- Existing user-facing port 18000 remains untouched. Local development preview:
  `http://127.0.0.1:18173/`. These checks precede separately authorized publishing; the live deployment was not changed.

The backend CI now also runs the isolated Java/HTTP/H2 examples and both standalone
Spring/JPA test projects after its normal build/integration checks, and uploads their
test reports. No deployment job was added.

## Current completion status (supersedes the first-increment scope below)

All 15 stages now have authored Korean and English lessons, prerequisites/glossary,
multiple topic explanations, minimal examples/expected output, selectable flows,
predictions, deliberate-failure diagnosis, independent exercises, hints/solutions,
tradeoffs and observable criteria. The UI no longer presents stages 5–15 as planned.
Reading remains separate from independent performance; no click awards mastery.

Stages 5–11 were completed first: relational persistence; transactions/JDBC/JPA/N+1/
pagination; authentication/authorization and web-security boundaries; testing and
debugging; collaboration/contracts/CI; Linux/Docker/configuration/deployment concepts;
observability/percentiles/controlled-load reasoning/RCA. Stages 12–15 then add index/
cache tradeoffs, actual-thread concurrency and idempotency, transactional outbox and
message-processing boundaries, and an independently assessed capstone with optional
bounded report/LLM-output validation concepts.

Execution scope is always visible above the tabs in advanced lessons. Real H2/JPA/
JDBC/thread checks are distinguished from in-memory Redis/Kafka/deployment/LLM models.
JPA is actually executed, not pseudocode: three isolated tests check 4-query lazy
traversal, 1-query fetch join and stable 2/1-row pagination. All eleven standalone
stage programs ran successfully with existing Java/H2; modified stages 14/15 were
checked again after adding bounded retry/DLQ and null/UTF-8 output-budget checks.
See `examples/beginner/README.md` for the per-stage execution/limit matrix.

The capstone has a runnable sequential service reference and a concrete independent
HTTP/auth/concurrency integration assignment. A supplied solution does not substitute
for a learner's independent work. Actual MySQL, Redis, Kafka, deployed infrastructure,
browser authentication and LLM provider behavior have not been newly integration-tested.
These are explicit exercise/verification boundaries, not claims of completed operations.

Implementation used no new downloads, Docker builds, existing-data writes or cleanup.
Publishing and merge were authorized separately after these implementation checks. Preview remains on port 18173; original port
18000 and its dist files are preserved. The earlier implementation record below is
retained as history; its pending-stage list is now superseded.

## First-increment scope (historical)

This is an incremental implementation, not a claim that all fifteen stages are
finished. The roadmap has stable identifiers for all fifteen requested stages.
Stages 1–4 have Korean and English lessons with prerequisites, definitions,
explanations, small examples, expected output, explanatory selectable flows,
prediction/reveal, guided work, deliberate failures, diagnosis, independent work,
hints, explanations, tradeoffs and observable pass criteria. Stages 5–15 are
explicitly marked **planned / lesson pending** and cannot receive read completion.

1. Files, shell, programs/processes/ports, environment variables and Git basics.
2. Java variables/types, arithmetic, branching, loops, methods, objects, collections,
   exceptions and small checks; no Spring prerequisite.
3. Browser/frontend/backend, URL/network/HTTP/JSON/HTTPS and real request boundaries.
4. Spring Boot, Controller/Service, constructor DI, conversion, business validation,
   consistent expected error responses and separate Service/HTTP tests.

The evolving example is one product-total calculation: text → Java → standard
library HTTP → standalone Spring. It needs no MySQL, Redis, Kafka or Docker.
See `examples/beginner/README.md` for executable commands and limits.

The interior learning UI uses Concept / Minimal example / Flow / Troubleshooting /
Independent practice tabs, keyboard navigation and the existing learning-help
layout. Reading completion and self-reported independent-work evidence are separate.
Next never awards completion or mastery. No AI chat, paid API or job-readiness claim.

## Existing behavior and data

The original six experiment lessons and their controls/reports remain available
through **Existing experiment lessons and records / 기존 실험 수업·저장 기록**.
Their storage keys and independent async/outbox predictions are not overwritten.
`incidentlens.curriculum.v1` stores the new stable-ID selection, notes, explicit read
marks and self-reported evidence. Legacy selection maps to a relevant new stage;
unavailable mapped stages remain honestly labeled pending. Existing original lesson
records remain reachable. No experiment, fault or report was changed for this work.

The position-based `lessonIndex === 5` experiment condition is now the semantic
`lesson.id === "diagnose"`; flow selection also uses stable IDs.

## Transient feedback scope

`App.tsx` synchronously invalidates transient notices and operation errors when a
route, learning view, lesson/mode/tab/scenario or selected session changes. Each
operation captures both a context generation and operation generation. Late success
and failure responses cannot repopulate feedback after leaving and returning.
Session creation cannot override selection after its original context expires.
Refreshing data and showing actual global active-fault warnings stay independent.
Navigation does not cancel or undo a server mutation that was already submitted.

Added regressions cover completed-before-navigation notices, in-flight navigation,
leave-and-return, late failure, current failure, session changes, lesson changes,
late creation and global warning preservation. Existing polling freshness tests remain.

## Verified locally

- Frontend: 47 Vitest tests passed; no-output TypeScript check passed.
- Browser: all 33 existing/new Playwright cases passed across desktop, laptop and
  mobile Chromium, with fixture APIs. No real experiment mutations were made.
- After bilingual output-model refinement, targeted curriculum cases passed on all
  three viewports; screenshots revealed missing Korean fallback in code/output and
  textarea controls, fixed using the already shipped Korean font.
- Frontend production build passed into `/tmp/incidentlens-curriculum-build`.
  The existing `apps/web/dist` and port-18000 deployment were not replaced.
- Java: 7 source-file execution cases passed.
- Toy HTTP: 8 actual HTTP cases passed against a script-owned temporary server on
  18181, then that server was stopped. Initially proposed ports 18081/18082 were
  already occupied; no existing process was stopped. Examples now use 18181/18182.
- Spring: 4 tests passed via the existing Gradle wrapper with `--offline` and
  bounded memory. These include MockMvc HTTP boundaries, not live Spring HTTP.
- The original IncidentLens backend is unchanged; its heavy integration suite and
  Docker rebuild were not run. No dependencies downloaded, cleanup performed,
  commit, push, merge or deployment.

Initial new test failures came from mismatched role/name selectors, a BEFORE button
whose active-fault precondition was not met in the fixture, and the intentionally
changed embedded home heading. Those were corrected without weakening behavior
checks. Full regression then passed.

## Review location and ownership

Working folder: `/home/mireu/Dev/incident-lens-career-20261002`.
Branch: `feat/beginner-curriculum-scoped-feedback`, based on the existing feature
HEAD `adc432abecb08c4a798728f0d7db3dae75d015c2`; no second checkout/worktree.
Remote main was read-only verified at `ef25a383fd6bf2c91d7c3200f97cdf19744a03a6`.
No fetch/rebase/reset was used to alter the existing feature history.

Before edits, repository state was clean. Existing Codex processes pointed at this
folder, but repeated CPU/status checks showed no active edit/build child processes
or working-tree activity. They were not interrupted or sent input. Their interactive
idle state could not be inspected directly. At the first implementation handoff, edits were uncommitted for review.

A separate local Vite preview was started on `http://127.0.0.1:18173/`, with API
proxy to the existing port-18000 app. Windows GET returned 200; port 18000 continued
serving its original `index-3dDQ6hsV.js`. The preview can stop when the task host is
closed; it is not a deployment. It has real experiment controls in the preserved
reference/free lab, so clicking those explicitly will operate the existing lab.
The curriculum itself does not automatically execute code or experiments.

## First-increment remaining plan (now authored; historical)

5–6: Extend the same product example with persistence, MySQL, constraints/CRUD,
transactions, JDBC/JPA, generated SQL, N+1 and pagination. Each needs real data-boundary
tests and independently solvable exercises before becoming available.

7–11: Authentication/authorization and web security; deeper tests/debugging;
issues/branches/PR/review/API contracts/CI; Linux/Docker/configuration/health/deploy/
rollback; logs/metrics/traces/percentiles/load and evidence-based RCA. Introduce
dependencies only after the learner has the requisite concept and observable need.

12–15: Measured indexing/Redis tradeoffs; concurrency/isolation/locks/idempotency;
workers/Kafka/outbox/retries/ordering/backpressure; independently implemented and
reviewed capstone with optional bounded/evaluated LLM integration.

For each stage, author both languages, verify runnable examples, cover failures and
observable pass criteria, then change its status from planned. The old advanced
reference lessons are supporting material, not substitutes for these new stages.
