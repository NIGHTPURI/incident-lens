# ADR 004: Cache-aside Redis with bounded local coalescing

## Context

The catalog is read frequently and immutable in the demo. Concurrent cold misses can repeat database work. Faults must be reversible without changing source code.

## Decision

Cache a bounded catalog page per category, use a local per-category lock with a two-second wait and double-check, and apply 25–35 second TTL jitter. The degraded mode bypasses both cache and coalescing. Redis also stores one explicitly expiring fault configuration; atomic Lua ownership prevents cross-session overwrite.

## Alternatives

An in-process cache would be simpler but would not demonstrate external-cache behavior. A distributed lock requires leases, fencing or careful stale-owner reasoning; that complexity is not justified for one API replica. Serving stale values could help resilience but needs a business staleness budget and a refresh policy absent from this immutable demo.

## Consequences

Coalescing is process-local. Redis failure routes reads to bounded database fallback and can produce overload errors. Fault reads fail open to healthy behavior. A SQL audit/Redis state update is not an atomic distributed transaction; actual Redis state and TTL take precedence. Cache gains must be measured using database load and latency, not assumed from adding Redis.
