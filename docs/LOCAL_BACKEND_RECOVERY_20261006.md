# Local backend recovery and live verification — 2026-10-06 KST

This follows the [2026-10-05 validation](VALIDATION_20261005.md). Its unreachable `:8080` observation is historical. Recovery required no source change, container recreation, image upgrade, volume removal, DB reset, host installation, security setting change or paid LLM call.

## Recovery and preservation

WSL reached Docker Desktop 4.85.0 / Engine 29.6.2. Existing MySQL/Redis/Kafka containers were stopped with exit 255. Applications repeatedly restarted; control-plane logged MySQL `Communications link failure`. Only the primary `incidentlens` stack was recovered; the separate `incidentlens-rca-20261003` stack was left unchanged.

Commands actually executed from the repository root:

```bash
docker ps -a --format '{{.ID}} {{.Names}} {{.Status}}'
docker volume ls --format '{{.Name}}'
docker stop -t 20 incidentlens-control-plane-1 incidentlens-demo-api-1 incidentlens-demo-worker-1
docker start incidentlens-mysql-1 incidentlens-redis-1 incidentlens-kafka-1
# After MySQL readiness; before restarting applications:
docker exec incidentlens-mysql-1 sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --events --set-gtid-purged=OFF --databases control_plane demo_api demo_worker' \
  > .local/verification/20261006/mysql-before.sql
docker start incidentlens-control-plane-1 incidentlens-demo-api-1 incidentlens-demo-worker-1 incidentlens-web-1
docker start incidentlens-loki-1 incidentlens-tempo-1 incidentlens-otel-collector-1 incidentlens-prometheus-1 incidentlens-grafana-1
```

The consistent logical backup is **5,448,597 bytes**, contains all three service DBs and is ignored by Git. Credentials were read inside MySQL, never printed or committed. All **19 original container IDs and 14 original volume names** remained identical. Original **10 sessions, 664 evidence rows, 9 reports and 1,750 rows each in orders/outbox/fulfillment/processed-event** retained their IDs. Existing session/report contents matched the snapshot. Earlier uncommitted-work and Go archives in `.local/preservation/20261005/` remain intact.

## Actual Chromium results

The browser accessed `http://127.0.0.1:5173` through its real API proxy to `:8080`; **no API routes were mocked**. The ignored verifier ran with:

```bash
node .local/verification/20261006/live-browser.mjs
# Fixed the verifier-only selector "Evidence" to "Evidence & RCA";
# reused the same sessions to finish the remaining checks:
node .local/verification/20261006/live-browser.mjs --resume
```

Seven checks passed:

1. Learning's explicit session button persisted and selected a real MySQL-backed session.
2. Three scoped catalog requests and one order reached the real Java API, MySQL outbox, Kafka and worker. Worker telemetry and MySQL confirmed processing/fulfillment. Worker logs contained matching incident/correlation/order/event IDs. Tempo returned HTTP 200 for the order trace.
3. Learning collected measured API and worker BEFORE evidence. Its saved session ultimately contained **25 BEFORE + 17 AFTER rows**.
4. Learning → free lab → browser back retained the new session's active-fault banner, separated selected sessions, cleared temporary feedback and sent no extra mutation requests.
5. Explicit fault disable, two AFTER catalog requests, AFTER collection and **rule-based** RCA generation persisted a report that reloaded identically. All citation IDs resolved to that session's BEFORE evidence. The existing control-plane had no RCA API key; no provider call occurred.
6. Free-lab collection saved **12 rows in its own session**, cleared its notice on returning to learning and left the learning report intact.
7. Korean/English, Python/C#, Windows/Linux, self-review, history, reload and mobile list opening/closing preserved the expected language-specific records without implicit writes. Actual desktop/mobile screenshots were inspected. Progress was exercised in a fresh browser context, without modifying the user's browser storage.

Verification records were retained:

| Record | ID |
| --- | --- |
| Learning (`Downstream delay learning`) | `464c6263-af64-44d7-a4e2-2d4ed86e4de0` |
| Free lab (`Live recovery verification 20261006 — free lab`) | `30297ae1-ef53-40a1-8bf9-2e655223f79c` |
| Order | `f46743c8-933a-4b90-b62f-53d485608fbc` |
| Event | `342b1db1-94a6-4329-bcbb-81b4339f6af3` |
| Tempo trace | `d9a89817ff4111e6b1359d583364169c` |

Final totals: **12 sessions, 718 evidence rows, 10 reports and 1,751 orders/fulfillments**. Final overview: no active fault, all four advertised services UP, outbox pending 0 and Kafka lag 0. All three application readiness URLs returned HTTP 200 and core containers were healthy.

This five-catalog-request/one-order smoke experiment is **not a k6 comparison or performance benchmark**. Full build, isolated MySQL integration and fixture browser results remain in the preceding record; runtime recovery did not rerun those local suites. Backups, write lists, preservation checks, logs and screenshots are in ignored `.local/verification/20261006/`; none are committed.

## Learning result links fixed

A further real-browser inspection exposed a UI defect: **Open detailed evidence and report** and **Open full comparison** restored the separate free-lab selection instead of the learning session. The pre-fix browser reproduced this using the two real sessions above.

`App.tsx` now tracks session ownership independently of the visible page. Explicit learning result links use `?view=evidence&context=learning` or `?view=comparison&context=learning`; normal free-lab navigation restores the free-lab selection. URL context restores the correct scope on reload and browser history, and never invokes a mutation. Existing separate storage keys remain compatible.

Post-fix commands actually executed:

```bash
cd apps/web
npm test -- --run --maxWorkers=2
npm run build
CI=1 npm run test:browser -- e2e/learning-isolation.spec.ts --workers=2
# From repository root, real backend, no API mocks:
node .local/verification/20261006/live-detail.mjs
```

Results: **55 unit tests passed**, TypeScript/Vite build passed (existing bundle-size warning), **9 focused browser cases passed** across desktop/laptop/mobile. The additional actual-browser check displayed the real saved learning RCA, kept its session in detail/comparison after reload/history, restored the separate free-lab session, retained dark theme and issued **zero API writes**. The final PR CI rechecks the full suites; these local results are separate from CI and the preceding seven live checks.

## Observability and deployment limits

Loki, Tempo and OTel collector started in their original containers. Grafana initially exited after SQLite locks and a provisioning panic. Its existing DB was backed up to `.local/verification/20261006/grafana-before/grafana.db`; the second start succeeded. `http://127.0.0.1:13001/api/health` returned HTTP 200 and `database: ok`.

**Prometheus remains stopped.** Both attempts failed at Docker Desktop forwarding for `127.0.0.1:9090`. Read-only `netsh interface ipv4 show excludedportrange protocol=tcp` showed Windows reserving **9026–9125**, including 9090; no WSL/Windows listener appeared. Port reservations/security settings were not changed, and the original container was not recreated to remap its port. Prometheus scraping and its Grafana dashboards are not claimed as recovered. Core experiments collect API/worker telemetry directly and passed independently.

Existing Docker application/web images were retained, not upgraded to the merged source. This verifies their API compatibility with the current learning frontend; it does not revalidate deployment of the RCA 500-row fix inside those older images. The current-source fix has separate H2 and isolated MySQL evidence. Native Windows language execution and production rollout remain outside this recovery.

## Addresses and inspection order

1. Open **http://127.0.0.1:5173** for the current curriculum. Choose UI language, programming language and OS, then start/continue a lesson. Browser progress is separate from executing the Java lab.
2. Open **Existing experiment lessons and records** → **Diagnose and recover**. Select learning session `464c6263…` to inspect saved evidence/RCA. The comparison panel remains unmeasured; no k6 workload was run.
3. Open **Free experiment lab** → **Evidence & RCA**, then select free-lab session `30297ae1…`. Its evidence is separate. Navigation neither enables faults nor regenerates reports.
4. Backend: **http://127.0.0.1:8080/actuator/health/readiness**; demo API/worker: `8081`/`8082`. Original Docker web: **http://127.0.0.1:13000**; Grafana: **http://127.0.0.1:13001**. Docker web is the earlier retained image; use `5173` for the completed curriculum.

`5173` is a running Vite development process. If it stops, restart from `apps/web` with `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Existing backend recovery uses `docker start` above, preserving environment/volumes; database reinitialization or volume removal is unnecessary.
