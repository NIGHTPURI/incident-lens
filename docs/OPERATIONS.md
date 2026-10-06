# Running and troubleshooting IncidentLens

## Current PC setup

See [PC setup](PC_SETUP.md) for learning-only/core/observability modes and resource checks. `${...}` below denotes `.env` host-port values (defaults 8080/8081/8082/3000/9090/3001), not literal URL text. `dev-up` and `dev-status` print actual Docker bindings. Vite reads the same `CONTROL_PLANE_PORT`. Internal service ports remain fixed. Browser choices never apply `.env`; changed bindings need Compose recreation, not only `restart`.

New comparison runners verify local context/bindings/runtime identity and matched demo/k6 targets before writes. Remote experiments and changing only `CONTROL_URL` are unsupported. Persisted configuration and time windows distinguish runs; old results remain explicitly unrecorded. Configuration hashes do not establish equivalent PC hardware or traffic. Fixed memory caps are current settings, not verified minimum specifications.

## Windows quick start

Install Docker Desktop with Linux containers/WSL2 integration and Git. The containerized demo does not require host Java or Node. Run from the repository root in PowerShell:

```powershell
Copy-Item .env.example .env
./scripts/dev-up.ps1
./scripts/demo-compare.ps1 -Scenario DOWNSTREAM_LATENCY -Vus 2 -DurationSeconds 10
```

If `.env` already exists, preserve it. `dev-up` copies the example only when missing. Open the dashboard URL printed by the script (default http://localhost:3000) and select the incident session printed by the comparison. The UI presents stored BEFORE/AFTER results, evidence and RCA. The script executes k6 in Docker and submits real summaries; it does not invent measurements. Creation of session/experiment resources is separate from starting a workload.

Windows can reserve ports even without a listening process. If Docker reports that port 3000 or 3001 is forbidden, inspect `netsh interface ipv4 show excludedportrange protocol=tcp`, then choose unreserved `WEB_PORT` and `GRAFANA_PORT` values in `.env`. This workspace uses 13000 and 13001 because Windows reserved 2620–3419. The startup and comparison scripts print the actual binding. Do not terminate unrelated Windows processes to reclaim a port.

`PROMETHEUS_PORT` also controls its loopback host binding (default `9090`), including `scripts/verify-observability.mjs`; Grafana's internal datasource remains `http://prometheus:9090`. This workspace's later deployment uses `13090` without changing Windows reservations. See [preserved main deployment](MAIN_LOCAL_DEPLOYMENT_20261006.md) for actual verification and rollback. Its archived original containers require the documented guarded tool; generic Compose `up/down` can select those archived service labels.

Enable the full telemetry stack:

```powershell
./scripts/dev-up.ps1 -Observability
```

This restarts application containers with OpenTelemetry enabled. Direct Compose equivalent:

```powershell
$env:OTEL_SDK_DISABLED = 'false'
docker compose --profile observability up --build -d --wait --wait-timeout 600
```

Grafana's first SQLite schema migration took approximately seven minutes on the measured Docker Desktop disk. Its readiness probe now keeps startup waiting until the HTTP API is available. Later starts reuse the schema. Optional Grafana plugin downloads are disabled; the dashboard uses bundled data sources. MySQL business durability settings remain unchanged.

The default core mode omits five observability containers; in-process telemetry still powers evidence/RCA/comparison. Plan roughly 6 GB available to Docker for core and 8 GB for observability, with additional headroom during Java image builds. These are conservative estimates, not measured hardware requirements.

## Entry points

| URL | Purpose |
| --- | --- |
| http://localhost:3000 | React dashboard |
| `http://127.0.0.1:${CONTROL_PLANE_PORT}/swagger-ui/index.html` | Control API documentation |
| `http://127.0.0.1:${DEMO_API_PORT}/swagger-ui/index.html` | Workload API documentation |
| `http://127.0.0.1:${CONTROL_PLANE_PORT}/actuator/health` | Control service health |
| `http://127.0.0.1:${DEMO_API_PORT}/actuator/health` | Demo API health |
| `http://127.0.0.1:${DEMO_WORKER_PORT}/actuator/health` | Worker health |
| http://localhost:3001 | Grafana (`admin`, password from `.env`) |
| http://localhost:9090 | Prometheus query UI |

All host ports bind to `127.0.0.1`. MySQL, Redis, Kafka and OTLP receivers are only reachable inside the Compose network. This is an intentionally local development lab; exposing it requires authentication, TLS, network policy and separate database identities.

## Reproducing each failure

```powershell
./scripts/demo-compare.ps1 -Scenario DOWNSTREAM_LATENCY -Parameter 400
./scripts/demo-compare.ps1 -Scenario DATABASE_DEGRADATION
./scripts/demo-compare.ps1 -Scenario KAFKA_SLOWDOWN -Parameter 400 -RecoverySeconds 20
./scripts/demo-compare.ps1 -Scenario CACHE_DEGRADATION
```

The latency parameter is milliseconds; database/cache modes switch algorithms and do not use it. Latency greater than the downstream budget can produce timeouts. VUs and durations are identical within each comparison; default 2 VUs for 10 seconds, permitted experiment range 1–50 VUs and 5–300 seconds. The recovery pause defaults to five seconds. For Kafka, check whether lag has drained before treating AFTER as a steady-state result; a larger pause does not itself prove recovery. Inspect the actual recorded lag.

Each phase runs the same mixed catalog/order workload, and counters exclude control requests. Run completion automatically collects phase-specific evidence. RCA is generated from BEFORE evidence, prior to disabling the fault. One fresh experiment is allowed per session and one run owns the shared lab at a time. Avoid competing standalone load or other operators during a comparison.

Before creating a session or activating its fault, both runners require three consecutive observations of zero outbox backlog and zero Kafka lag, at least two seconds apart. Missing metrics or unhealthy services fail the preflight. The default drain deadline is 300 seconds; use `-IdleTimeoutSeconds 600` or `IDLE_TIMEOUT_SECONDS=600` for a slow disk. This guard was added after real measurements showed that old outbox events could postpone session-scoped Kafka faults until after the fault was disabled. It does not lock out standalone traffic, and it does not change the declared recovery pause between BEFORE and AFTER.

Both runner variants disable their fault on failure and abort any active run, including an AFTER run. A failed/aborted experiment is retained for inspection; create a new session for another controlled comparison. Abrupt process/host termination can prevent cleanup. Fault state expires after 15 minutes, and runs have a bounded lease; use the UI to disable the fault immediately after a failed run when possible.

Existing UI-created experiments can be executed with:

```powershell
./scripts/demo-compare.ps1 -SessionId '<session-id>' -ExperimentId '<experiment-id>'
```

Only a fresh `CREATED` experiment can use this command. Its stored workload overrides CLI workload defaults. The session/experiment ownership is checked before activation.

## Bash equivalents

Bash comparison requires `curl`, `jq` and Docker Compose. For example, install jq using your operating system's package manager.

```bash
bash scripts/dev-up.sh --observability
VUS=2 DURATION_SECONDS=10 bash scripts/demo-compare.sh --scenario DOWNSTREAM_LATENCY
bash scripts/dev-down.sh
```

More workload details and limits are in [loadtest/README.md](../loadtest/README.md).

## Verification

For host-side verification install Java 21 and Node 22. Gradle is supplied by the wrapper. Windows:

```powershell
./scripts/verify.ps1 -Integration
```

Linux/macOS:

```bash
bash scripts/verify.sh --integration
```

The scripts check required files, compile/test Java, run frontend tests/build and validate all Compose profiles. The integration option requires a functioning Docker daemon. Without it, unit tests/builds still run; passing those does not validate MySQL/Kafka behavior. CI includes infrastructure integration tests plus building/starting Compose and running a short full comparison, with test reports/logs/summaries uploaded as artifacts. A configured CI workflow is not a claim that its first external run has passed.

Executed verification includes both `bash scripts/verify.sh` and cross-platform PowerShell `./scripts/verify.ps1 -Integration`, native telemetry configuration validators, image builds, healthy core startup and real before/after experiments. The initial WSL Docker error was resolved by starting Docker Desktop. MySQL initialization on this host needed several minutes; bounded health deadlines were increased without relaxing database durability. See [measured results](results/README.md) and [SESSION_STATE.md](../SESSION_STATE.md) for current evidence. Temporary HTTP-stub checks also validate k6 summary serialization and runner failure cleanup; those timings are deliberately excluded from benchmark results.

After an instrumented comparison, `node scripts/verify-observability.mjs` checks all three Prometheus targets, a nonzero workload metric, provisioned Grafana data sources/dashboard, structured fault logs and a stored Tempo trace joining the API and worker. It uses the local `.env` Grafana password without printing it and writes proof to ignored `artifacts/observability/`. Run it from the repository root with Node 22; allow several seconds for OTLP export. The checked-in [actual proof](results/observability/verification.json) includes HTTP, MySQL, Kafka and Redis span names. Grafana's Tempo plugin lacks a generic health endpoint, so verification queries Tempo through Grafana's data source proxy.

## Useful diagnostics

```powershell
docker compose ps
docker compose logs --tail 100 control-plane demo-api demo-worker
docker compose --profile observability logs --tail 100 otel-collector loki tempo
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group incidentlens-fulfillment-v1
docker compose exec redis redis-cli GET incidentlens:fault
```

Grafana's provisioned IncidentLens dashboard includes throughput, error rate, p95/p99, database lookup timings, cache hits, outbox backlog, Kafka lag, retries, DB pool usage, JVM heap and an incident log timeline. Search Loki by `incidentId`/`correlationId`; inspect trace IDs in Tempo. The Collector accepts native OTLP logs and traces without privileged Docker socket access. Missing panels are missing telemetry, never a zero-success claim. Direct MySQL inspection is possible with `docker compose exec mysql mysql -uincidentlens -p demo_api`; the password is prompted rather than printed in shell history.

If startup fails, inspect `docker compose ps` and the relevant logs before retrying. `docker compose config --quiet` validates interpolation/schema without starting anything; a valid file cannot prove images start. The Java containers wait for healthy MySQL, Redis and Kafka. Application health checks have a startup period to allow migrations/initial Kafka setup on a laptop.

## Shutdown and reset

```powershell
./scripts/dev-down.ps1
```

This preserves named database/broker/telemetry volumes and `.env`. Changing `.env` passwords does not update users in an existing MySQL volume. For an intentional destructive reset of local demo data only:

```powershell
docker compose --profile observability down -v
```

Raw workload summaries remain under ignored `artifacts/`; deleting them does not delete stored experiments. Never commit `.env`, API keys, telemetry exports containing sensitive data, or generated build directories.
