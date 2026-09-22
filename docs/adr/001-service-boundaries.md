# ADR 001: Three applications and a narrow shared library

## Context

The laboratory must observe a backend while its request path or asynchronous worker is impaired. A service split should make a real failure boundary observable, without creating a service per noun.

## Decision

Keep a control plane, order API, and fulfillment worker. Give each its own MySQL database. Share only event/context/telemetry/HTTP safety code through `libs/common`. The root is the repository itself rather than a redundant nested `incidentlens/` directory.

## Alternatives

A modular monolith would simplify deployment, but worker slowdown and control-plane availability would be harder to demonstrate independently. Separate catalog, inventory, billing and tracing services would create operational cost without another justified business boundary.

## Consequences

There are only three custom backend processes, but eventual consistency and versioned events are real concerns. The common library couples release versions; separate credentials, backward-compatible contracts and independent release management would be needed in production. The local MySQL instance is a shared failure domain.
