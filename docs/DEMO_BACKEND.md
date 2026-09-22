# Demo backend engineering notes

## Business flow and transaction boundaries

`POST /api/orders` accepts `{ "productId": 1, "quantity": 2 }` and a case-sensitive `Idempotency-Key` (1–96 ASCII identifier characters). The database contains 10,000 deterministic catalog products. An order and its `OrderCreated` JSON event commit in one MySQL transaction. HTTP returns 201 for creation, 200 plus `Idempotency-Replayed: true` for an identical replay, and 409 if the key is reused for a different product/quantity. Quantity is bounded to 1–100. `GET /api/orders/{id}` returns the original accepted order; fulfillment is asynchronous.

The API deliberately uses both JPA and JDBC. JPA maps the order and performs a pessimistic current read. JDBC expresses the MySQL no-op upsert and lease queries explicitly. Both use the same datasource and `JpaTransactionManager`, so the order insert and outbox insert share a transaction. MySQL's unique index on `idempotency_key` serializes concurrent submissions. The generated order UUID distinguishes insertion from replay without relying on connection-specific affected-row semantics. The read uses `FOR UPDATE` so it sees the winning row under MySQL's default REPEATABLE READ isolation.

A naive DB commit then Kafka send loses the event if the process dies between them. Sending first produces an event for business data that might roll back. The outbox makes *the order plus intent to publish* atomic. It does not make Kafka and MySQL one transaction.

## Outbox lease and retry

`OutboxStore.claim()` selects one due unpublished row using `FOR UPDATE SKIP LOCKED`, assigns a random lease token, increments its attempt count, and commits a 15-second lease. The relay publishes outside that transaction, waits up to five seconds for the Kafka acknowledgment, and marks the row published only if it still owns the token. It loops over at most ten records per scheduled invocation.

A failed acknowledgment leaves the row pending and schedules a 2, 4, 8, …, 60-second capped delay. A crashed owner leaves a lease that another publisher can reclaim. A stale owner cannot acknowledge another owner's claim. Publication can succeed immediately before a crash or timeout, so redelivery is expected. `enable.idempotence=true` handles producer-session transport retries; it does **not** eliminate duplicates across application restarts or outbox retries. Pending rows are never silently discarded.

The demo retains published outbox rows and deduplication records indefinitely. A production deployment needs age-based archival and a documented replay horizon before deleting deduplication records. Unbounded retention is a known storage limitation, not a cleanup feature.

## Consumer idempotency and failure handling

`FulfillmentService.fulfill()` executes one MySQL transaction containing a `processed_event` marker and `fulfillment` business row. A no-op upsert acquires an exclusive unique-key lock, and a fresh delivery token distinguishes a newly inserted marker from a replay. This avoids the shared-lock-to-exclusive-lock upgrade that can make `INSERT IGNORE` plus `SELECT FOR UPDATE` deadlock when several duplicate deliveries arrive together. The fingerprint rejects an event ID reused for conflicting business data. The order primary key additionally protects against duplicate business events that have different event IDs.

A committed fulfillment followed by a failed Kafka offset commit is safe: Kafka redelivers, the marker exists, and business state remains unchanged. A failed business transaction rolls back its marker, allowing a later attempt to process the event. No exactly-once claim is made across systems.

Topics: `incidentlens.orders.v1` and `incidentlens.orders.v1.dlq`, each three partitions in the laptop demo. Key: order UUID. Group: `incidentlens-fulfillment-v1`. Producer acknowledgments: `all`; consumer auto-commit: disabled; acknowledgment mode: record. Consumers use three threads, ten records per poll, and a two-minute poll interval. Consumer slowdown occurs **before** opening a database transaction.

Transient failures get three scheduled retries at 200, 400, and 800 ms. Invalid JSON, unsupported schema versions, and conflicting business identifiers go directly to the DLQ. DLQ publication must succeed before the source record is considered recovered; a DLQ producer failure does not silently advance the source offset. `retryCount` counts scheduled retries. The original payload and Spring Kafka failure headers remain available in the DLQ. Replay is an operator action after the cause is fixed; there is no automatic DLQ replay loop.

Events contain schema version, event/order IDs, product/quantity, occurrence time, session ID, phase, correlation ID, and W3C traceparent. Additive optional fields are the compatible evolution path. Required-field semantic changes require a new version and migration plan.

## Four controlled fault modes

All modes use Redis key `incidentlens:fault` with JSON `{sessionId,scenario,enabled,parameter,expiresAt}`. Both TTL and the absolute expiration protect against abandoned fault activation. A fault affects only matching `X-Incident-Id` requests/events. Redis failure disables fault injection; it does not latch a stale fault on.

| Mode | Degraded behavior | Corrected behavior | Measurement |
|---|---|---|---|
| `DOWNSTREAM_LATENCY` | Named `inventory.lookup` span sleeps for the configured 0–3000 ms. A 1500 ms budget produces HTTP 504 for larger delays. | Fault disabled removes the synthetic delay. | HTTP p50/p95/p99, timeout events, traces. |
| `DATABASE_DEGRADATION` | Cache bypass; `LOWER(category)` prevents an indexed category lookup, then 50 individual detail queries produce an N+1 workload. | One category-indexed join returns the same 50 rows; normal caching also resumes. | Catalog DB-operation p95, DB-operation count, HTTP percentiles. |
| `KAFKA_SLOWDOWN` | Matching events wait the configured 0–3000 ms before processing. | Consumers process at their normal rate and drain backlog. | Broker end offsets minus committed group offsets, processing count, delayed-event evidence. |
| `CACHE_DEGRADATION` | Bypass Redis and request coalescing; each catalog request reaches MySQL. | Cache hit or one coalesced in-process fill; 25–35 second TTL jitter. | Hit ratio, catalog DB-operation count, DB-operation p95, HTTP percentiles. |

The database experiment changes both query shape and caching. Therefore an HTTP improvement cannot be attributed solely to the SQL rewrite. The operation-level DB timer isolates the actual SQL work, and query count/cold-cache runs help explain the separate contributions. `LOWER(category)` can use a primary-index scan to satisfy `ORDER BY id LIMIT 50`; the guaranteed extra cost is the 50 detail round trips, not an asserted full-table scan. No synthetic delay is used in the database fault.

The downstream dependency is a deterministic in-process simulator so a fourth custom service is unnecessary. The cache mode is controlled cache degradation, not a claim to reproduce every distributed stampede pattern.

## Redis behavior

Catalog keys are `incidentlens:catalog:v1:{books|electronics|games|office}`. Entries contain the 50-item result and expire after a randomized 25–35 seconds. Data can be stale for at most that TTL; the seeded catalog is immutable during the demo. The finite category set bounds both cache cardinality and lock cardinality. An in-process lock coalesces concurrent misses and rereads Redis after locking. Lock acquisition is bounded to two seconds; excess contention receives 503. Redis network operations have 500 ms connect/read bounds. If Redis fails, requests use fresh MySQL data under the same per-process lock. That preserves availability at reduced throughput and increases database load. It is not a cross-replica distributed lock; production scaling needs a wider coordination/stale-cache policy.

## Telemetry and evidence contract

`GET /internal/telemetry?sessionId=<id>&phase=BEFORE|AFTER|NONE` returns:

```json
{"service":"demo-api","observedAt":"...","metrics":{"requestCount":0,"p95Ms":null},"traceIds":[],"events":[]}
```

`sessionId=ALL&phase=ALL` is a process-local aggregate for the overview. The HTTP filter observes `/api/*` routes and reads `X-Incident-Id`, `X-Experiment-Phase`, and `X-Correlation-Id`. Identifier syntax and lengths are restricted before they enter MDC. Counters are cumulative for each phase, and phase percentiles use the latest 8192 duration observations. The store holds at most 128 session/phase buckets with 32 selected events and 12 trace IDs each. Eviction/restarts lose these diagnostic samples; durable experiment snapshots live in the control plane, and Prometheus is the long-term time-series source. An empty percentile or hit ratio is `null`, not a fabricated zero.

Metric keys: `requestCount`, `errorCount`, `p50Ms`, `p95Ms`, `p99Ms`, `dbQueryP95Ms`, `dbQueryCount`, `latencySampleCount`, `cacheHitRate` (0–1), `cacheHits`, `cacheMisses`, `processedCount`, `duplicateCount`, `retryCount`; API adds `outboxPending`, worker adds `kafkaLag`. DB query timing is a whole catalog database operation: one join or the 51-query degraded path. It is not an individual JDBC-statement timer. Kafka lag and outbox pending are service-wide gauges sampled at collection time; they are not isolated by incident. Missing broker measurements are null/NaN, not zero.

Prometheus custom names include `incidentlens_workload_duration_seconds`, `incidentlens_workload_requests_total{result}`, `incidentlens_catalog_database_seconds`, `incidentlens_cache_requests_total{result}`, `incidentlens_events_total{result}`, `incidentlens_events_retries_total`, `incidentlens_outbox_pending`, `incidentlens_outbox_published_total`, `incidentlens_outbox_failures_total`, and `incidentlens_kafka_consumer_lag`. HTTP, JVM, Hikari, and Kafka client instrumentation supplement them. Histograms are enabled for HTTP/workload/catalog DB timers without high-cardinality incident tags.

The OpenTelemetry agent instruments HTTP/JDBC/Redis/Kafka. The API captures traceparent inside the order transaction; the outbox relay restores that context around Kafka publication. This keeps the asynchronous publish linked to the originating request rather than the scheduler alone. Kafka instrumentation carries context to the consumer. Structured JSON logs include service, correlation ID, incident ID, phase where available, and agent trace identifiers. Logs avoid payloads, secrets, and SQL error details in client responses. JSON API bodies are limited to 32 KiB, including chunked bodies.

## Verification boundaries

Docker-free tests cover telemetry isolation, expiration/scoping, bounded body handling, 16-thread cold-cache coalescing, fault switching/recovery, validation, duplicate decisions, and real HTTP/JPA/JDBC transaction wiring against an explicitly separate H2 smoke schema. H2 is not evidence for MySQL locking or migration compatibility.

The `integrationTest` task starts MySQL, Redis, and Kafka with Testcontainers. It is deliberately not silently skipped if Docker is absent. Tests cover twelve concurrent identical API requests, transactional order/outbox rollback, failed Kafka publication and recovery, outbox lease reclamation/fencing, twelve concurrent event deliveries, duplicate business events, transaction rollback of deduplication markers, actual Kafka redelivery, transient failure retry, and DLQ payload preservation. See root `SESSION_STATE.md` for actual executed results rather than inferring pass status from test existence.

Reference points for review: [MySQL locking reads and SKIP LOCKED](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html), [InnoDB duplicate-key lock behavior](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html), [MySQL INSERT/CTE syntax](https://dev.mysql.com/doc/refman/8.0/en/with.html), and [Spring Kafka error handling](https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html). Verify behavior against the pinned dependency versions; documentation for newer major releases may differ.

Testcontainers MySQL uses a bounded 512 MiB tmpfs data directory to avoid slow Docker Desktop first-time disk initialization; it still executes the actual MySQL migrations, transactions, locks, and constraints. These tests do not benchmark fsync or power-loss durability. The demo itself uses a persistent named MySQL volume. Test readiness deadlines are bounded (Kafka 180 seconds; MySQL JDBC startup 240 seconds), allowing cold Windows/Docker starts without silently ignoring startup failures.

Ordering scope: the current business model emits only one `OrderCreated` event per order. Kafka preserves partition append order, but multiple outbox relay instances can publish different rows in a different order from their database creation times. Adding updates/cancellations would require aggregate versions and consumer transition checks or stricter per-aggregate publishing coordination. The present design does not promise general database-commit ordering across concurrent publishers.
