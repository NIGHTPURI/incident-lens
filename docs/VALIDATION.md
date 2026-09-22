# Executed verification

This document records execution in the development workspace on **2026-09-22**. It is not a claim that GitHub Actions has run on a remote repository.

## Environment

- Windows 11 host with WSL2 Linux development shell.
- Java 21.0.12, Gradle wrapper 8.14.3, Node 22.23.2, npm 10.9.8.
- Docker Desktop 4.85.0 / Engine 29.6.2 / Compose 5.3.1; approximately 8 GB allocated to the Linux engine.
- PowerShell 7.5.2 was downloaded to a temporary directory to execute the actual PowerShell verification script under Linux. Native Windows PowerShell has not been separately exercised.
- Default web/Grafana ports were in a Windows excluded port range. The ignored local `.env` uses `WEB_PORT=13000`, `GRAFANA_PORT=13001`; repository defaults remain configurable 3000/3001.

## Commands that passed

| Command | Observed result |
|---|---|
| `./gradlew build --no-daemon` | All three applications compile and package; 35 unit/application tests pass |
| `./gradlew integrationTest --no-daemon` | 15 tests pass, zero failures/skips, using actual MySQL/Kafka/Redis containers |
| `bash scripts/verify.sh` | Backend, clean frontend install/test/build, required files and Compose validation pass |
| `pwsh -NoProfile -File scripts/verify.ps1 -Integration` | Final primary verification workflow passes, including runner protocol checks and infrastructure tests |
| `pwsh -NoProfile -File scripts/tests/compare-protocol.tests.ps1` | Idle gating, phase completion, failure cleanup, missing telemetry and existing-run rejection pass |
| `npm --prefix apps/web ci` | Clean lockfile installation succeeds; audit reports 0 vulnerabilities |
| `npm --prefix apps/web test -- --run` | 14 frontend tests pass |
| `npm --prefix apps/web run build` | TypeScript check and Vite production build pass |
| `npm --prefix apps/web run test:browser` | 4 Playwright desktop/mobile tests passed with installed Chromium; API fixtures explicitly labelled |
| `docker compose --profile observability --profile loadtest config --quiet` | All profiles validate |
| `docker compose build` | Web and all three Java runtime images build |
| `docker compose up -d --wait --wait-timeout 600` | Core MySQL/Redis/Kafka/API/worker/control/web healthy after host-port configuration |
| `pwsh -NoProfile -File scripts/dev-up.ps1 -Observability` | Final Java/web images build and optional telemetry stack starts |
| Bash comparison with 2 VUs, 5 seconds, 2,000 ms downstream delay | Instrumented BEFORE: 4 expected timeouts / 8 requests; AFTER: 0 errors / 36 requests; new idle gate exercised |
| Live Playwright capture against the running dashboard | Real comparisons, all RCA citations, no browser errors or API mutations; mobile overview and comparison checked |
| Native Prometheus/Loki/Tempo/Collector configuration validators | Exit 0; Collector memory limit corrected after actual startup checks |
| `GET /api/overview`, `/actuator/health`, `/v3/api-docs`, web HTTP | Real service connectivity, health, generated API docs and dashboard respond |

The outbox evidence rule was improved after observing actual backlog. Its targeted build passed, followed by another complete PowerShell `-Integration` verification on the final source. The control-plane MySQL suite reran; unchanged demo suites were up-to-date from their successful execution. The total above includes the new outbox/RCA regression test.

Browser fixture tests prove UI interactions, not backend integration. H2 application tests are explicitly distinct from the MySQL Testcontainers tests. API/worker integration tests cover real broker publication, redelivery, retry and DLQ behavior. See Gradle reports under `apps/*/build/reports/tests/` for test details.

## Measured application behavior

Four real k6 BEFORE/AFTER experiments completed, each with persisted raw summaries and evidence; all eight phases had zero HTTP errors. The database/cache changes reduced lookup work without demonstrating a general throughput or overall p95 improvement. Kafka delay executed for the scoped session and sampled lag grew from zero to six. These are single short local runs.

The durable [recovery snapshot](results/recovery-before-observability.json) verified **1,482 orders = 1,482 outbox rows = 1,482 fulfilled orders = 1,482 processed events**, with zero unpublished outbox rows after the workload drained. This includes warm-up and smoke traffic as well as the measured phases.

## Runtime observability

The [stored validation](results/observability/verification.json) confirms three Prometheus targets UP and 13 provisioned Grafana panels. Loki returned actual worker log streams. A stored Tempo trace joins `POST /api/orders`, MySQL order/outbox statements, Kafka publication and processing, worker deduplication/fulfillment statements, and Redis access across `demo-api` and `demo-worker`. This is runtime ingestion evidence, not only configuration validation.

The separate [instrumented timeout experiment](results/instrumented-timeout/experiment.json) deliberately produced errors before restoration. Its timings are functional validation with tracing enabled and are not mixed into the four core-profile performance comparisons.

## Failures found and resolved

- Gradle CLI absent: supplied a checksum-verified Gradle wrapper.
- Docker Desktop initially stopped: started the installed engine; real Linux Docker access then worked.
- Slow first-time Docker disk initialization: tests use bounded ephemeral MySQL tmpfs, pinned images and explicit readiness budgets; Compose retains durable named volumes.
- MySQL seed query reused a temporary table: corrected compatible seed query and verified Flyway on actual MySQL.
- Potential duplicate-consumer lock upgrade race: exclusive upsert plus delivery token; concurrent tests pass.
- Local timezone differed from MySQL test session: aligned JDBC/session UTC, then the expiration lifecycle test passed.
- Directly closing a cached Spring context in test teardown caused callback failure: replaced with proper context lifecycle/eviction.
- Docker Desktop rejected reserved host ports: configurable web/Grafana ports preserve other host services.
- Nginx healthcheck selected IPv6 through `localhost`: explicit 127.0.0.1 health probe matches its listener.
- Collector's initial 192 MiB cap prevented reliable native startup: 512 MiB plus a Go memory budget validated successfully.
- Required request fields, prior telemetry scopes, old citations and LLM type coercion: fixed and covered by regression tests.
- Kafka-only diagnosis missed unpublished intent: added a separately cited outbox hypothesis and queue-idle runner checks.
- Populated mobile Overview overflowed its viewport: fixed table containment and added browser coverage using actual populated state.
- First-run Grafana SQLite migrations took several minutes: added real readiness probes and disabled optional plugin downloads; successful telemetry ingestion was verified.

No unresolved application test failure is hidden as a skipped test. Full comparisons and runtime telemetry are recorded in [results](results/README.md) and the final [session state](../SESSION_STATE.md).
