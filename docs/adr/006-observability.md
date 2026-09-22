# ADR 006: Optional telemetry stack with direct scoped evidence

## Context

Metrics show prevalence; logs explain individual decisions; traces show path/time relationships. The complete stack can be heavy for a laptop, while global metrics alone cannot reliably identify one experiment's samples.

## Decision

Use Micrometer/Prometheus for aggregate metrics, JSON logs into Loki and OTel traces into Tempo through the Collector. Provision Grafana. Use the Java agent for framework instrumentation and explicit W3C propagation through persisted outbox events. Keep the stack in a Compose profile. Collect deterministic scoped snapshots directly from demo services for the core product.

## Alternatives

Only logging lacks timing/counter structure. Only tracing misses aggregate rates. Sending all signals through the Collector is possible but would duplicate existing Micrometer metrics unless carefully configured. A mandatory full stack increases startup/resource burden.

## Consequences

Core evidence works without Grafana or a model key. The snapshot ring buffers are bounded, approximate at high volume, and reset on restart; they are not a durable time-series database. Durable evidence records identify collection gaps. Observability needs sampling, retention, authentication and cardinality budgets before production use. An absent trace ID is shown as unavailable, never fabricated.
