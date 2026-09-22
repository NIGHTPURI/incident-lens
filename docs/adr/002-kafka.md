# ADR 002: Kafka for asynchronous fulfillment

## Context

Order acceptance should not require fulfillment to complete within the HTTP request. The demo needs to expose backlog, delayed processing and duplicate delivery.

## Decision

Use one versioned order topic, an order-ID partition key, one consumer group and one DLQ. Use bounded transient retries and preserve the source message if DLQ publication fails. Broker acknowledgement uses `acks=all`; the local broker has only one replica.

## Alternatives

Synchronous REST would reduce infrastructure but couple acceptance latency/availability to fulfillment. A database work queue could support this scale, but would not demonstrate Kafka offset/rebalance/partition failure semantics. Multiple retry topics are unnecessary for a short local retry budget.

## Consequences

Fulfillment is eventually consistent. Consumers must be idempotent and retention/replay must be planned. Blocking retries delay a partition. A single local broker provides no replication fault tolerance; production needs multiple replicas, minimum in-sync replicas and explicit retention. Kafka is chosen for the failure model being studied, not because this small workload requires its capacity.
