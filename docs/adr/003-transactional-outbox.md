# ADR 003: Transactional outbox with leased publication

## Context

Saving an order and publishing Kafka are separate commits. Save-then-publish can lose an event after a crash; publish-then-save can emit an order that never commits. Producer idempotence does not solve that database boundary.

## Decision

Insert the order and JSON event in one local MySQL transaction. A scheduled relay claims due rows with `FOR UPDATE SKIP LOCKED`, stores a unique 15-second lease token, commits the claim, and publishes outside the transaction. It marks publication only after acknowledgement and only with the matching token. Failure backs off with a cap; expired claims are retryable. Event identity is preserved across every attempt.

The worker stores the deduplication marker and fulfillment in its own database transaction. Unique event and order constraints are the final consistency protection. Conflicting payload reuse is rejected.

## Alternatives

Naive sequential writes have an unavoidable failure gap. Distributed two-phase commit is not supported by this architecture and would add coordination/availability cost. CDC/Debezium is defensible at scale but adds connectors, offsets and operational requirements before polling becomes a measured bottleneck.

## Consequences

At-least-once publication is intentional. A crash after acknowledgement but before marking published sends a duplicate. The consumer must handle it; the relay cannot safely pretend an ambiguous send failed. Polling adds latency, database load and bounded throughput. Old outbox and dedup rows need retention policies. A 15-second lease is not a proof that a stalled producer cannot later send; fencing protects database updates, not network side effects.

## Verification

Testcontainers tests cover order/outbox atomicity, concurrent idempotency, claim fencing/recovery, Kafka delivery, and repeated event handling. Local H2 tests check application wiring only. Exact executed results live in `SESSION_STATE.md`.
