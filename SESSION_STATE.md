# IncidentLens session state

Updated: 2026-09-22. **The local core is implemented, running and verified.** No external blocker remains.

## Current task: portfolio UI polish and Docker diagnostics

Baseline: clean working tree at `be795ad` on 2026-09-22. Backend contracts, measured experiments and visual identity are preserved. Implemented larger/higher-contrast type, explicit keyboard focus and skip link, text/icon states, missing-metric explanations, lab guidance, observation/inference framing, report jump links, accessible tables and textual comparison direction. Fixed reproduced cross-session/late-response races and independent resource error recovery; six new regression tests bring frontend total to 33. Redis unavailability does not imply fault disabled. No new dependency or backend feature.

Verified: 33 frontend tests, TypeScript and production build; 15 desktop/laptop/mobile Chromium cases in both locales; aggregate `bash scripts/verify.sh` passed after the final mobile correction. Final visual review found a narrow mobile hypothesis column; confidence is now stacked below it, and Korean paragraph words are kept together. The repeated browser suite checks that geometry and passes without retries. Thirteen final real GET-only screenshots match the deployed assets; saved measurements are unchanged, with zero browser errors/API mutations or document overflow. Selected rendered text contrasts are at least 4.89:1; this is not a full WCAG certification.

Docker diagnostics compare an immutable baseline: native 4.48–5.11s, ordinary Alpine 5.27–6.12s, forced BuildKit command 5.57–5.63s. Actual Docker VHD is SATA HDD-backed while WSL/source uses NVMe. The original user-reported 218s RUN did not reproduce; no speculative configuration fix was committed. The final source passed at native **4.31s / Compose 35.95s** (RUN 10.3s); web-only deployment is healthy on port 13000 with matching JS/CSS assets. The earlier UI build measured 4.25s / 37.80s and is preserved separately in the diagnostics. No daemon cleanup, data removal or disk migration occurred. The actual host is CIM-confirmed Windows 10 Pro; Windows 11 remains the target. See docs/DOCKER_BUILD_DIAGNOSTICS.md.

Implementation and required verification are complete. No outstanding backend change is needed. Next owner checks are a captured recurrence or controlled Docker-disk relocation experiment, native Windows 11 validation and a manual screen-reader review; none was claimed as completed. Use `git log --oneline` for the separate UI and diagnostics milestones.

## Previous task: Korean / English UI localization

Historical record of the frontend-only follow-up requested after the original backend handoff. Its test counts and interrupted Docker build below are superseded by the current polish verification and successful deployment above. Existing backend implementations, REST paths, wire fields, scenario/phase machine values and all infrastructure configuration remain unchanged.

Completed: typed two-language dictionaries in `apps/web/src/i18n/translations.ts`; React Context provider; default Korean; accessible top-right selector; `incidentlens.locale` localStorage persistence; document language/title/description; localized numeric/date/missing-data presentation. All four dashboard pages, incident detail/timeline, controls, notices, error/empty states, badges and comparison headings use the dictionary. No package or lockfile changes. CSS changes are limited to the selector, Korean font fallbacks, heading word wrapping and mobile header containment.

Raw evidence explanations, RCA text, API problem details and technical identifiers remain original. BEFORE remains the fault-active machine phase and is labelled 변경 전 / 장애 상태, not a healthy baseline; AFTER is 복구 후. `DATABASE_DEGRADATION` remains the existing identifier. Switching language preserves typed form values and selection, and issues no API mutation.

Current verification: `npm --prefix apps/web test -- --run` passes **27 tests** (8 App, 8 provider/dictionary, 6 formatting, 5 API). TypeScript and Vite production build pass. Full Chromium desktop/mobile suite passes **8 tests**, including both languages on every populated page, citations, raw data preservation, empty/offline states, unchanged machine values, Korean → English → reload → English and new-tab revisit. The final eight-case run after the Korean heading typography adjustment also passed (0 failures, about 1.1 minutes). Korean/English desktop and mobile screenshots were visually checked; no document overflow or clipped cards/buttons/badges. Backend tests listed below are the previous verified baseline and were not rerun for this UI-only task.

Resolved development checks: a Testing Library assertion initially used `toHaveValue` on a radio; corrected to the actual value attribute plus checked-state assertion. Browser development HMR during simultaneous edits invalidated one Context execution; rerunning with source frozen passed. Comprehensive bilingual browser cases have a bounded 60-second deadline (eight screens plus reload/new-tab checks), no retries and no weakened assertions. Minimal Linux browser lacked Korean fonts; temporary fontconfig exposes the existing Windows fonts for screenshot review, without adding a shipped dependency.

All required localization checks pass. An optional `docker compose build web` was interrupted during unusually slow base-image resolution after metadata requests took about 142 seconds; no new runtime image was produced and existing containers were not changed. This optional Docker image check is not counted as a pass. The existing container still serves the earlier UI until `docker compose up -d --build --no-deps web` succeeds. The source builds normally with npm. A real Chromium check through a temporary Vite frontend proxy also passed without fixtures: control-plane/demo-api/demo-worker/redis UP, Korean → English → reload persistence, and an existing saved session timeline. No browser errors, API mutations or layout overflow occurred. Its ignored provenance is `apps/web/test-results/live-localization.json`; the temporary Vite process was stopped. Localization is complete as one logical changeset, ready for the requested commit; Git history/status records the resulting commit. No implementation or required verification task remains. Ignored browser captures are under `apps/web/test-results/`; existing measured screenshots are preserved. No backend work is pending or authorized in this follow-up.

## Completed work and architecture

- Java 21 / Spring Boot 3.5.16 / Gradle 8.14.3: `control-plane`, `demo-api`, `demo-worker`; narrow shared contracts/telemetry in `libs/common`.
- Control plane: persisted sessions, fault audit, evidence with provenance, validated rule/optional-compatible-LLM RCA, experiment state machine, lab lease/expiry and matching BEFORE/AFTER workloads.
- Demo API: 10,000-product catalog, Redis cache/coalescing, concurrent request idempotency, orders and transactional outbox in one MySQL transaction. Relay uses fenced leases and bounded retries.
- Worker: Kafka retries/DLQ and transactionally deduplicated fulfillment. One Kafka broker and one MySQL instance with three service databases are intentional local boundaries.
- Four reversible faults: downstream delay/timeout, inefficient database lookup, slow consumer and cache bypass. Faults are session scoped, bounded and expiring.
- React dashboard, OpenAPI, k6 scenarios, Windows PowerShell/Bash scripts, Docker Compose, GitHub Actions, ADRs/interview/security/AWS/AI engineering documentation.
- Optional Prometheus/Grafana/Loki/Tempo/OTel profile was started and checked using real telemetry. Live UI screenshots are under `apps/web/screenshots/`.

## Commands that work / test status

| Command/check | Actual result |
|---|---|
| `./gradlew build --no-daemon` | All applications compile/package; 35 unit/application/common tests pass |
| `./gradlew integrationTest --no-daemon` | 15 real MySQL/Kafka/Redis integration tests pass; 0 failures/errors/skips |
| `bash scripts/verify.sh` | Pass |
| `pwsh -NoLogo -NoProfile -File scripts/verify.ps1 -Integration` | Final aggregate pass, including runner protocol regressions; actual PowerShell 7.5.2 under WSL |
| `npm --prefix apps/web ci`, `npm --prefix apps/web test -- --run`, `npm --prefix apps/web run build` | Pass; latest polish run: 33 frontend tests; clean install/audit reports 0 vulnerabilities |
| `npm --prefix apps/web run test:browser` | Latest polish run: 15 desktop/laptop/mobile Playwright tests pass with explicitly labelled fixtures, both locales and persistence |
| Real Playwright capture | 13 final KO/EN images from the deployed web and an actual completed experiment; citations resolve, measurements unchanged, no browser errors/API mutations/document overflow |
| `docker compose --progress plain build web` | Latest source passes in 35.95s; RUN 10.3s, npm ci cached; web-only deploy healthy |
| `docker compose --profile observability --profile loadtest config --quiet` | All profiles valid |
| `pwsh -NoProfile -File scripts/dev-up.ps1 -Observability` | Final runtime images build; core and optional observability start |
| PowerShell four-scenario comparisons | All COMPLETE; eight measured phases, 0 HTTP errors; raw data preserved |
| Bash instrumented timeout/recovery comparison | COMPLETE; BEFORE 4 expected timeouts/8 requests, AFTER 0 errors/36 requests; queue-idle preflight exercised |

The earlier core aggregate verification reran the changed control-plane MySQL suite; unchanged demo integration tasks reused their previously passing outputs. The current UI-only aggregate ran `scripts/verify.sh`: Gradle's 24 unchanged tasks were up-to-date, with no new backend integration execution. H2 HTTP tests and real MySQL tests are deliberately distinguished. Integration MySQL uses ephemeral tmpfs; Compose retains a durable named volume. No missing Docker tests are silently skipped. Browser fixture values are never represented as benchmark results.

## Measured and runtime evidence

`docs/results/README.md` links raw summaries, per-route timings, exact workload/hardware metadata and caveats. These are single short local runs, not production or statistically significant capacity estimates.

- Latency scenario, 5 VUs, 20 s/phase, 1200 ms delay: mixed p95 1215.30→870.74ms; catalog p95 1252.65→12.49ms.
- DB scenario: logical lookup p95 39.80→1.42ms, but mixed p95 929.70→941.58ms. Cache behavior also changes; no overall p95 improvement is claimed.
- Cache scenario: 147→1 logical DB loads and 0→99.3% cache hit rate; throughput 14.30→14.14req/s. Avoided work is demonstrated; a throughput gain is not.
- Kafka scenario: 10 VUs, 20 s, 2000 ms consumer delay; scoped delay events executed and sampled lag grew 0→6, snapshots 3→1. The larger bottleneck was unpublished outbox work.
- Final durable consistency: **1504 orders = 1504 outbox rows = 1504 fulfillments = 1504 processed events; outbox pending 0, Kafka lag 0, active fault null.** See `docs/results/final-consistency.json`.
- Prometheus: 3 targets UP; Grafana: 13 provisioned panels; actual worker/fault logs in Loki. Stored Tempo trace `9ab4ecb47b77a2b4543cc239fd55a151` spans HTTP order acceptance, SQL/outbox, Kafka publish/process, worker dedup/fulfillment SQL and Redis access. Evidence: `docs/results/observability/`.
- Original RCA reports are preserved; updated reports were regenerated from unchanged BEFORE evidence after adding the outbox hypothesis. Raw measurements remain unchanged.

## Environment and exact demo commands

Confirmed Windows 10 Pro host (build 19045), WSL2 shell; Windows 11 remains the requested target. Earlier prose inferred the host OS from the target and is corrected here. Java 21.0.12, Node 22.23.2/npm10.9.8. Docker Desktop 4.85.0 / Engine 29.6.2 / Compose 5.3.1; 8 vCPU and approximately 8 GB engine memory. Docker started successfully after initially being stopped.

Current ignored `.env`: `WEB_PORT=13000`, `GRAFANA_PORT=13001` because Windows reserves default ports 3000/3001 on this host. Current services remain running: dashboard http://localhost:13000, Grafana http://localhost:13001, control API http://localhost:8080, demo API http://localhost:8081, Prometheus http://localhost:9090. Fresh checkouts default to 3000/3001; startup prints actual URLs.

```powershell
.\scripts\dev-up.ps1 -Observability
.\scripts\demo-compare.ps1 -Scenario DOWNSTREAM_LATENCY -Parameter 1200 -Vus 5 -DurationSeconds 20
```

Bash: `bash scripts/dev-up.sh --observability`, then `VUS=5 DURATION_SECONDS=20 PARAMETER=1200 bash scripts/demo-compare.sh`.

`dev-down` preserves named data volumes. Do not remove volumes unless intentionally discarding experiments. Comparisons wait for three idle queue samples; default deadline 300 s is adjustable to 900 s for slow durable backlogs. First-time image builds/MySQL initialization/Grafana SQLite migrations can take several minutes; readiness checks bound the wait.

This tool environment requires authorized escalation for network/Docker/Git writes. Temporary validation tools were `/tmp/incidentlens-pwsh/pwsh` and Chromium under `/tmp/incidentlens-playwright`; these are not shipped dependencies.

## Commands that fail / resolved issues

No outstanding application build, test or runtime validation failure. Earlier environment and implementation failures were corrected: absent Gradle CLI (wrapper), stopped Docker, slow database startup, MySQL seed compatibility, duplicate-delivery lock upgrade race, UTC test connections, Spring test teardown, required DTO validation, telemetry contamination, citation retention, provider JSON coercion, Nginx health probe, reserved Windows ports, Collector memory, k6/PowerShell protocol handling, populated mobile overflow and Grafana readiness. `docs/AI_ENGINEERING.md` records genuine corrections.

Gradle reports future Gradle 9 deprecations; pinned 8.14.3 works. Tempo's generic Grafana datasource-health endpoint is not implemented; actual proxied Tempo search and trace retrieval pass and are the recorded verification.

## Remaining limits and next priorities

Core completion has no pending implementation task. Native Windows PowerShell, a remote GitHub Actions run, a paid LLM call and AWS deployment have not been executed. PowerShell 7 under WSL and compatible-provider HTTP stub tests pass; AWS is design documentation only.

The lab is local-only, unauthenticated, single-broker and single-API-replica. Cache fill coordination is process local. Diagnostic telemetry is bounded/in-memory; evidence is durable. Global queue gauges, warm-up, cache differences and sequential-run carryover limit benchmark inference. The serial outbox is a measured capacity constraint; multiple commits/disk overhead are hypotheses to profile. Fault Redis state plus SQL audit is not a distributed atomic transaction. Retention, authorization and deployment isolation are required before production use.

Highest-value follow-up: personally run the demo on Windows, study the code walkthroughs and ADRs, repeat isolated experiments, then address retention/authentication or relay throughput if extending beyond this portfolio lab. Do not add Kubernetes or cloud resources merely for scope.

## Source control

Local `main` contains logical backend, RCA, dashboard, infrastructure and documentation milestones. No remote push, history rewrite or unrelated user work removal occurred. `.env`, dependencies, build outputs and transient artifacts are ignored. Use `git log --oneline` for exact commits and `docs/VALIDATION.md` for the verification record.
