# Reproducible workload

`baseline.js`, `latency-incident.js`, `cache-stampede.js`, and `kafka-backlog.js` share the same workload: one catalog GET and one idempotent order POST per iteration. The controlled variable is the fault, not the traffic script. Each request carries its incident and experiment phase. Both BEFORE and AFTER use the experiment's stored VU count/duration. Defaults (5 VUs, 20 seconds, 50 ms think time) target a laptop.

PowerShell smoke: `./scripts/demo-compare.ps1 -Vus 2 -DurationSeconds 10`.

PowerShell longer comparison: `./scripts/demo-compare.ps1 -Scenario KAFKA_SLOWDOWN -Vus 10 -DurationSeconds 60 -Parameter 2000 -RecoverySeconds 20 -IdleTimeoutSeconds 600`. On durable local storage, the resulting outbox can take longer than the default 300-second preflight deadline to drain before a subsequent experiment. Inspect both backlogs; a low Kafka lag alone does not prove that all orders reached the broker.

Bash equivalent: `VUS=2 DURATION_SECONDS=10 bash scripts/demo-compare.sh --scenario DOWNSTREAM_LATENCY` (requires `curl`, `jq`, Docker Compose).

Standalone baseline: `./scripts/demo-baseline.ps1 -Vus 2 -DurationSeconds 10` or `VUS=2 DURATION_SECONDS=10 bash scripts/demo-baseline.sh`. Baseline traffic is not persisted as an experiment. For baseline traffic on a busy lab, disable any existing fault first.

Increase load gradually. Fifty VUs can overwhelm a laptop when the cache/DB faults amplify queries. Never target systems you do not own.

Comparison runners first wait for three healthy, zero-backlog observations two seconds apart. This prevents old durable outbox work from masking a later session's Kafka fault. The bounded default is 300 seconds (`-IdleTimeoutSeconds` / `IDLE_TIMEOUT_SECONDS`, maximum 900). Unavailable backlog metrics fail the preflight before any fault/run mutation. The same idle check is not repeated between phases: the documented recovery pause remains part of the experiment protocol.

Raw measured results land in ignored `artifacts/`. Metrics count only workload requests; p50/p95/p99 describe the combined catalog/order request population, not iteration duration. Throughput divides by actual test runtime including graceful completion. The control plane stores DB/cache/worker telemetry with each run. k6 emits no performance thresholds because each deliberately degraded scenario has different expected behavior. A zero-request run fails.

The scripts disable their fault in `finally`/`trap` even when workload execution fails. An abrupt host shutdown cannot execute cleanup; disable the fault in the UI after restart. A five-second recovery pause is part of the default protocol; it is **not** a guarantee that the Kafka backlog has drained. Increase `-RecoverySeconds`/`RECOVERY_SECONDS` and inspect lag before interpreting recovery. Warm-up/JIT effects and fixed-VU feedback mean these are controlled local experiments, not production capacity claims. Actual executed comparisons and their limitations are preserved in [docs/results](../docs/results/README.md). Per-route `.diagnostics.json` files separate catalog from order latency; they are diagnostic artifacts, not part of the strict completion request schema.

Saved UI experiments can be run with `./scripts/demo-compare.ps1 -SessionId <id> -ExperimentId <id>` or `bash scripts/demo-compare.sh --session-id <id> --experiment-id <id>`. The script reads the persisted workload settings and rejects a mismatched session or an experiment that is no longer `CREATED` before touching fault state.

Custom summary implementation follows the [k6 handleSummary contract](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/).
