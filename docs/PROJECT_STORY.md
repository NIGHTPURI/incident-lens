# Project story: making incident explanations reviewable

## Problem

A distributed request can return successfully while downstream work accumulates. Latency, cache misses and consumer lag describe different parts of that failure. The portfolio objective is to make those relationships reproducible and testable, with optional AI assisting interpretation.

## Naive design

A plausible first design saves an order, publishes Kafka immediately, retries failed requests without a key, then sends raw logs to an LLM. This was a design alternative considered during implementation—not a claim about an earlier deployed system.

## Failure mode

There is no atomic commit spanning MySQL and Kafka. A crash can lose an event or duplicate delivery. Concurrent retries can duplicate business state. Raw log prompting can assert unsupported causes. Independent BEFORE/AFTER runs can accidentally compare different workloads or mix old telemetry.

## Architecture decision

Choose three justified process boundaries, local transactions with an outbox, unique constraints and idempotent fulfillment. Persist an explicit experiment protocol and evidence identities. Keep deterministic analysis available without credentials. Add four reversible failure scenarios rather than a broad, untested microservice topology.

## Implementation

The relay leases work and fences completion; the worker commits deduplication and fulfillment together. Catalog caching uses double-check coalescing and jitter. Slow queries, downstream delays, cache bypass and slow consumers are session-scoped controls. The control plane collects scoped measurements/events, preserves their sources, and validates RCA references. The runner persists identical workload settings and always attempts cleanup.

## Measurement

Read `docs/results/README.md` and `SESSION_STATE.md` for exact executed commands and environment. Test fixtures deliberately use known values to prove validation; these values are not performance results. A local comparison can demonstrate a failure/recovery relationship, but does not establish a production SLO or statistically isolated optimization effect.

The first real comparisons exposed a bottleneck outside the injected cache/query path: HTTP acceptance outpaced the serial durable outbox relay, leaving hundreds of unpublished rows while Kafka lag could remain low. This led to a separate evidence-cited outbox hypothesis, cautious interpretation of single lag snapshots, and a queue-idle preflight in the comparison runner. These changes came from an observed failure of the initial demonstration protocol, not an invented production incident.

## Result

The deliverable is code, tests, a dashboard and a reproducible protocol. The strongest claim is that each explanation can be traced back to a stored observation and that consistency is reasoned about at explicit failure boundaries. Only executed measurements should appear in a resume as measured numbers.

## Tradeoff

The system is intentionally small: one broker, one API replica, bounded in-memory diagnostic samples and no public authentication. Polling adds latency and SQL work; duplicate safety adds storage. The DB scenario also bypasses caching, so total latency changes have multiple contributing factors. Those limitations are part of the engineering story, not hidden footnotes.

## Resume language to adapt after personal review

- Built a Java/Spring incident laboratory with transactional outbox, idempotent Kafka fulfillment and concurrent duplicate protection.
- Implemented reproducible fault/recovery experiments with persisted workload settings, scoped telemetry and evidence-cited RCA.
- Validated database/event failure behavior using Testcontainers and provisioned an optional Prometheus/Grafana/Loki/Tempo stack.
- Add a measured performance bullet only after personally rerunning and understanding the saved results; include workload and environment.

Do not claim production users, operational ownership or engineer review that has not happened.
