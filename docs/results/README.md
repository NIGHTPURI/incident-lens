# Executed local experiments

Measured on 2026-09-22 using the real Docker MySQL/Redis/Kafka applications and k6. These are single local runs, not production benchmarks or statistically significant improvement claims. BEFORE enables the fault; AFTER restores the normal path. See [metadata.json](metadata.json) for hardware, images, workload, phase protocol and limitations.

Each workload lasts 20 scheduled seconds plus bounded graceful completion. Request counts can differ because constant-VU traffic is a closed loop. Percentiles here combine catalog GET and order POST; raw per-route diagnostics accompany every experiment. All four comparisons used core mode with the OpenTelemetry exporter disabled. Instrumented telemetry validation is separate.

| Scenario | VUs | Requests BEFORE / AFTER | Errors BEFORE / AFTER | Mixed p95 ms BEFORE / AFTER | Requests/sec BEFORE / AFTER |
| --- | ---: | ---: | ---: | ---: | ---: |
| [downstream-latency](downstream-latency/experiment.json) | 5 | 122 / 334 | 0 / 0 | 1215.30 / 870.74 | 5.71 / 16.42 |
| [database-degradation](database-degradation/experiment.json) | 5 | 270 / 292 | 0 / 0 | 929.70 / 941.58 | 13.16 / 13.95 |
| [cache-degradation](cache-degradation/experiment.json) | 5 | 294 / 292 | 0 / 0 | 964.53 / 888.64 | 14.30 / 14.14 |
| [kafka-slowdown](kafka-slowdown/experiment.json) | 10 | 590 / 604 | 0 / 0 | 945.49 / 896.95 | 28.72 / 29.72 |

## What the measurements support

- Downstream latency used a 1200ms injected delay. Catalog p95 was1252.65ms BEFORE and12.49ms AFTER. The order route dominated much of the remaining mixed latency; commit/disk overhead is a candidate explanation, not an isolated profiling result.
- Database degradation recorded logical database-lookup p95 of 39.80ms BEFORE and 1.42ms AFTER. Degraded mode bypasses cache and issues 51 SQL operations per lookup; corrected mode combines batched SQL with Redis. This experiment cannot separate those effects. Mixed request p95 did not improve (929.70→941.58ms), so no end-to-end p95 improvement is claimed.
- Cache degradation recorded 147 logical database loads BEFORE and 1 AFTER, with hit rate 0→99.3%. Throughput stayed essentially flat (14.30→14.14 requests/sec). The catalog page is 50 rows from 10,000 seeded products and inexpensive to query locally; the measurements demonstrate avoided work rather than a capacity gain.
- Kafka slowdown used 2000ms per scoped event, 10 VUs and 20 seconds recovery. Before starting it, the old outbox and Kafka backlog were both observed at zero. BEFORE evidence includes executed CONSUMER_DELAY events and 18 completed scoped events. The [two-second lag samples](kafka-slowdown/lag-timeseries.json) show growth from 0 to a peak 6; completion snapshots were 3 BEFORE and 1 AFTER. The larger backlog was in the durable outbox, so this is a modest consumer-lag demonstration with a measured producer-side bottleneck. A small Kafka lag does not imply that all business orders have reached Kafka.

## Reproduction

From a healthy Docker lab:

```powershell
./scripts/demo-compare.ps1 -Scenario DOWNSTREAM_LATENCY -Parameter 1200 -Vus 5 -DurationSeconds 20
./scripts/demo-compare.ps1 -Scenario DATABASE_DEGRADATION -Vus 5 -DurationSeconds 20
./scripts/demo-compare.ps1 -Scenario CACHE_DEGRADATION -Vus 5 -DurationSeconds 20
./scripts/demo-compare.ps1 -Scenario KAFKA_SLOWDOWN -Parameter 2000 -Vus 10 -DurationSeconds 20 -RecoverySeconds 20
```

The current runners additionally require three consecutive healthy idle observations before starting a new experiment, with a 300-second deadline. This was added after these measurements exposed old outbox backlog masking later session-scoped faults. The original Kafka run used the recorded [manual zero-backlog gate](kafka-slowdown/preflight-drain.json); the other original runs did not. Therefore new runs have a stronger isolation protocol and should not be treated as bit-for-bit reproductions of historical timings. Increase IdleTimeoutSeconds when a durable backlog needs more time; do not weaken durability to obtain attractive numbers.

## Evidence provenance

Each scenario directory contains the exact k6 completion payloads, per-route diagnostic summaries, stored experiment and full session evidence. The originally generated report is preserved as report-at-measurement.json. If a report is regenerated after a rule correction, session.json contains the new report while the raw measurements and original report remain unchanged; the generatedAt fields identify that difference. Database lookup counts measure logical loads, not SQL statement counts. Outbox and consumer lag are global sampled gauges; worker counts represent processing completed when evidence was collected.

The results contain generated local identifiers only. They describe this host, catalog size, workload and software revision; they do not establish real-user traffic, production capacity, or a percentage optimization guarantee.

## Final functional and telemetry validation

The separate [instrumented timeout check](instrumented-timeout/experiment.json) ran the final Bash runner and its automated idle gate with 2 VUs for 5 seconds per phase. A 1800 ms delay exceeded the downstream budget: BEFORE recorded 8 requests and 4 timeout failures; AFTER recorded 36 requests with no errors. This cold instrumented check validates failure/recovery behavior; its timings are not part of the four-scenario performance table.

[Actual telemetry proof](observability/verification.json) verifies all three Prometheus application targets, a nonzero custom workload counter, 13 provisioned Grafana panels, structured fault events in Loki, worker fulfillment logs and a Tempo trace spanning demo-api and demo-worker. The saved trace includes POST /api/orders, order/outbox SQL, Kafka publish/process, processed-event/fulfillment SQL and Redis GET. The [raw trace](observability/distributed-trace.json) and [worker logs](observability/worker-logs.json) retain identifiers for inspection.

[Final database reconciliation](final-consistency.json) found 1504 orders, 1504 outbox rows, 1504 processed events and 1504 fulfillments; unpublished outbox rows and Kafka lag were zero, fault state was inactive and all four reported service dependencies were UP. This is eventual convergence after draining, not a claim of synchronous delivery or exactly-once transport.

Host metadata correction from the publication audit: the current machine reports Microsoft Windows 10 Pro, build 19045 through Win32_OperatingSystem. Windows 11 is the requested target environment. The original `metadata.json` OS label was inferred from that target and is retained as historical metadata, not a verified Windows 11 measurement. All request/latency/consistency values remain unchanged. See [Docker diagnostics](../DOCKER_BUILD_DIAGNOSTICS.md) for the observed environment.
