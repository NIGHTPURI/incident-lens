# Interview guide

Explain code and failure windows first. Measurements belong to the recorded local environment, not imaginary production traffic.

| Question | Defensible answer and code to inspect |
|---|---|
| Why Kafka instead of synchronous REST? | Acceptance should survive a slow fulfillment consumer. Kafka makes backlog, replay and partition semantics observable. REST would be simpler if synchronous completion were required. Inspect `OutboxRelay` and `OrderListener`. |
| Why Redis? | Catalog reads can reuse immutable pages; cold misses are coalesced per process. It also carries expiring fault configuration. This is not the source of truth for orders. Inspect `CatalogService` and `FaultCoordinator`. |
| What if Kafka publishes twice? | Same event ID is deduplicated in the worker transaction; a unique order ID prevents a second fulfillment even if event identity changes. Conflicting business payload reuse is rejected. |
| DB commits but publication fails? | The durable outbox row stays eligible for retry. The API does not pretend that a Kafka exception can roll back a database transaction that already committed. |
| Why transactional outbox? | It atomically saves state and publication intent. It closes the lost-intent gap, not the duplicate-delivery gap. Walk through the crash-after-ack case. |
| How is request idempotency guaranteed? | A case-sensitive unique DB key serializes concurrent contenders; a current locked read retrieves the winner. Same key/different product or quantity yields 409. An in-memory lookup alone would race. |
| What is the consistency model? | Strong local order transaction, eventual fulfillment, at-least-once event delivery, idempotent fulfillment effect. No global exactly-once claim. |
| What fails first under high load? | It depends on the scenario: servlet/DB pools, cache cold-load locking, relay publication capacity or consumer throughput. Inspect queue lag, pending outbox and pool waits before guessing. In the recorded durable-Docker runs, outbox publication trailed HTTP acceptance: the serial relay performs multiple commits per event and drained slowly. Disk/commit overhead is a hypothesis to profile, not an isolated measurement. Batching claims/completion or a CDC relay are candidates to measure; weakening durability would change the experiment. |
| What does p95 mean? |95% of observed request durations are at or below the 95th-percentile value. It is not an average and says nothing about the worst 5%. Define population and window; do not average instance p95s. |
| Why OpenTelemetry? | It standardizes context/export and instruments real library boundaries. Outbox persistence requires explicit context restoration; automatic request tracing cannot infer that relationship. |
| How do logs, metrics and traces differ? | Metrics summarize populations, logs explain discrete events, traces relate work along a path. All need a consistent service/time/context vocabulary. |
| Why not LLM over raw logs? | Raw logs contain noise and possibly hostile text. The evidence package limits scope, retains provenance and lets the result cite inspectable observations. |
| How is hallucination reduced? | Deterministic extraction, bounded evidence, explicit uncertainty, local schema/citation validation and fallback. This reduces errors but does not prove semantic truth or causality. |
| Why these boundaries? | Control must remain available when workload is faulty; API and worker have different execution/consistency behavior. More services would add cost without another useful boundary. |
| What if Redis is unavailable? | Fault injection fails open to healthy behavior. Catalog misses fall back to MySQL with bounded local locking; increased errors/latency remain possible. Redis is not an order-dedup store. |
| What if a worker crashes after DB commit? | Offset redelivery re-enters dedup and returns a no-op. Dedup must commit in the same local transaction as fulfillment. |
| What if the DLQ is unavailable? | Recovery publication throws; do not commit the source as recovered. Otherwise an error handler becomes a message-loss bug. |
| Are claims statistically strong? | A single short laptop run is a demonstration. Repeat experiments with warm-up, randomized order, drained queues and constant-arrival-rate load before estimating capacity or isolating one optimization. |
| What changes for production? | Authz on fault controls, TLS, independent DB credentials, replicated Kafka, retention, schema compatibility, SLOs, sampling, secrets management, deployment isolation and capacity experiments. |
| How would this run on AWS? | ECS services/ECR, RDS, ElastiCache, MSK, ALB and managed secrets/telemetry; verify workload cost first. See AWS_DEPLOYMENT.md. |

## Five code walkthroughs to practice

1. `OrderService.create`: show why JDBC upsert + JPA locking read participate in the same transaction; compare a racing check-then-insert.
2. `OutboxStore.claim` → `OutboxRelay.publishBatch`: draw the 15-second lease and crash-after-ack window; explain fencing versus network duplicates.
3. `FulfillmentService.fulfill`: explain unique constraints, concurrent duplicate locks, payload conflicts and offset independence.
4. `IncidentService.start/complete`: explain state/lease arbitration, identical workload checks, evidence provenance, and measurement limitations.
5. `RcaService` → providers → `RcaValidator`: demonstrate an invented evidence ID being rejected and rule-based fallback succeeding.

## Questions to ask yourself

Can you point to a test for every consistency claim? Can you explain why the DB degradation also changes cache behavior? Why is a 5-second wait not proof of queue recovery? Which local checks use H2, and which actually execute MySQL? What happens to telemetry on restart? Which result is a measured fact, which a hypothesis and which a recommendation?
