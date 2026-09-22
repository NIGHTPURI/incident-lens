# ADR 007: One experiment per session and a leased lab lock

## Context

Concurrent fault changes or reused cumulative histograms can make an impressive comparison meaningless. A crashed runner must not permanently lock the laboratory.

## Decision

Persist the workload before starting. Require active owned degradation for BEFORE and no active faults for AFTER. Use a singleton pessimistic DB row lock plus duration-bound lease to serialize runs, and reject duplicate/late completions. Permit one experiment per session so phase telemetry remains independent. Emergency disable aborts the run; recovery starts a fresh session.

## Alternatives

Allowing arbitrary reruns is convenient but requires run IDs in every telemetry bucket and durable transition arbitration. A process-local mutex breaks across control replicas and restarts. A permanent lock cannot recover from a crashed client.

## Consequences

The workflow is deliberately strict and scripts must clean up on failure. It is still a local scientific instrument: operator-submitted summaries are trusted, unrelated traffic can affect shared gauges, and equal VUs do not imply equal offered request rate. Cold/warm caches and recovery carryover must be disclosed when interpreting results.
