# Backend learning lab verification — 2026-10-03

This record describes checks run against the current `feat/backend-learning-lab` worktree. The UI captures are from a local Vite server proxied to the isolated local control plane at `127.0.0.1:18080`; no public site received fault or load traffic. The original `incidentlens` Compose project and its volumes were not changed. The existing isolated `incidentlens-rca-20261003` project was reused, and new sessions were created there. [Four-run JSON](results/learning-verification-2026-10-03.json) · [screen capture metadata](../apps/web/screenshots/learning-capture.json).

## Checks

| Check | Current result |
|---|---|
| Frontend Vitest, including bilingual lesson content and actual code links | 35 passed across 6 files |
| Frontend TypeScript and production build | Passed; self-hosted Korean font included |
| Playwright desktop, laptop and mobile | 24 passed across all three viewports, including the final flow and embedded views |
| Keyboard and language | Browser tests covered focus, diagram selection, mobile folded help, Korean/English switching, prediction and lesson persistence |
| Existing dashboard workflow | Browser tests covered session creation, fault toggle, evidence, RCA, comparison preparation and empty states |
| Backend unit + HTTP boundary tests | 78 passed, including 10 real HTTP transport tests |
| Backend Testcontainers integration | 15 passed; full `./gradlew build integrationTest --no-daemon` succeeded |

The Korean/English captures show the actual rendered lesson screen at 1440×900 and 390×844. `apps/web/screenshots/learning-{ko,en}-{desktop,mobile}.png` are UI images, **not measured performance graphs**. [This local report capture](../apps/web/screenshots/learning-results-live.png) shows the saved cache-bypass comparison and rule-based RCA as rendered by the connected frontend. A direct browser check selected that stored session, confirmed both phases and the causal hypothesis, reloaded the page, and retrieved the same report again. The font is served locally under its included OFL license. `?embed=1` and `?view=lab` are implemented navigation options, not deployments to 쉬었음.com.

The initial `--rerun-tasks` Gradle run passed the unit/HTTP suite and control-plane integration, then failed one demo-api integration assertion during Kafka partition leader startup (`NOT_LEADER_OR_FOLLOWER`). The production code was unchanged. The test now retries publication within a 30-second bound and still fails if Kafka remains unavailable. A subsequent full `build integrationTest` gate succeeded: 78 unit/HTTP tests and 15 Testcontainers integration tests, with no failures or skips. This is a current-code pass; the first failed attempt is retained here for provenance.

## Local four-fault comparison

The local verification used 2 constant virtual users, 5 scheduled seconds per phase, a 2-second recovery wait, core services with OpenTelemetry export disabled, and a three-observation idle check of outbox pending and Kafka lag before each new session. The application was healthy and had no active fault before each scenario. `BEFORE` used the active scoped fault; `AFTER` ran after explicit disable. The backend stored each report and completed comparison; GET `/api/sessions/{id}` returned them again. All four reports used the default `rule-based` provider. The finally path sent a disable command, and the last overview reported no active fault. No existing container or volume was deleted.

| Fault (parameter) | Requests BEFORE / AFTER | Errors BEFORE / AFTER | Mixed request p95 ms BEFORE / AFTER | Other observed evidence |
|---|---:|---:|---:|---|
| Downstream delay (350 ms) | 4 / 12 | 2 / 0 | 8007 / 2394 | Simulated request delays; actual elapsed phase time exceeded 5 s due to in-flight requests |
| DB degradation (0) | 12 / 18 | 0 / 0 | 2109 / 1821 | DB query p95 471 / 3 ms; cache hit rate 0 / 0.89 |
| Worker slowdown (500 ms) | 30 / 40 | 0 / 0 | 1163 / 709 | Kafka lag sampled at 1 / 1; this run does not isolate a lag recovery effect |
| Cache bypass (0) | 32 / 32 | 0 / 0 | 845 / 944 | Cache hit rate 0 / 0.94 and DB query p95 19 / 1.6 ms, yet mixed request p95 worsened |

The mixed p95 combines catalog GET and order POST. Closed-loop virtual users produce different request counts when requests take different time; the observed phase durations were also not identical. DB degradation changes query shape **and** bypasses cache. The worker and cache results do not justify a blanket claim that request latency improves after recovery. The small 5-second runs, cache warm-up, shared lag gauge, and unrelated host activity limit causal conclusions. The detailed JSON retains units and unrounded measurements. The browser's empty and unmeasured states were tested separately; they do not replace absent data with zero.

The checked-in Bash runner could not be executed here because host `jq` is absent. A temporary Python standard-library harness performed the same API phase protocol and invoked the repository's k6 container workload for these local checks. Its first attempt used the wrong Compose project directory, so k6 could not see `/scripts/baseline.js`; that attempt produced no workload measurement and disabled its newly created fault. The corrected run specified the original project directory and completed all four comparisons. This does **not** count as a direct pass of `scripts/demo-compare.sh` in this environment.

## Limitations and follow-up

The local UI was inspected with real backend connectivity and browser fixture tests covered explicit controls and disconnected service behavior. Browser fixtures are interaction checks, not benchmark measurements. The optional paid LLM path was not called; the default report path and existing 65,536-byte/timeout/cancellation HTTP tests were run in the Gradle suite. No production deployment, team repository write, or public load test occurred.
