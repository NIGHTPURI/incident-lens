# API quick reference

Control-plane base: `http://127.0.0.1:${CONTROL_PLANE_PORT}` (default 8080); demo API: `http://127.0.0.1:${DEMO_API_PORT}` (default 8081). These are host-port variables; use dev-status to print actual URLs. Swagger UI and `/v3/api-docs` describe generated schemas. Errors use `application/problem+json` with safe `status/detail`; malformed/invalid input400, missing resource404, state/idempotency conflict409, oversized JSON413, unavailable dependency503. Initial order/session/experiment creation201; repeated identical order200.

## Create and inspect an incident

```powershell
$base = 'http://localhost:8080'
$session = Invoke-RestMethod "$base/api/sessions" -Method Post -ContentType 'application/json' -Body '{"name":"Slow inventory","scenario":"DOWNSTREAM_LATENCY"}'
Invoke-RestMethod "$base/api/sessions/$($session.id)/fault" -Method Put -ContentType 'application/json' -Body '{"enabled":true,"parameter":400}'
Invoke-RestMethod "$base/api/sessions/$($session.id)"
# Always disable a manually enabled fault after the demonstration.
Invoke-RestMethod "$base/api/sessions/$($session.id)/fault" -Method Put -ContentType 'application/json' -Body '{"enabled":false,"parameter":0}'
```

Prefer `scripts/demo-compare.ps1` for a complete measured run; it guarantees an attempted cleanup even on failure.

## Order replay

```powershell
$headers = @{ 'Idempotency-Key' = 'interview-order-001' }
$body = '{"productId":1,"quantity":2}'
Invoke-RestMethod 'http://localhost:8081/api/orders' -Method Post -Headers $headers -ContentType 'application/json' -Body $body
Invoke-RestMethod 'http://localhost:8081/api/orders' -Method Post -Headers $headers -ContentType 'application/json' -Body $body
```

Both calls identify the same order; a changed quantity with that key conflicts. Idempotency keys are case-sensitive 1–96 character ASCII letters/digits plus `. _ : -`. Current demo keys do not expire; retention must be designed before production use.

## Routes

| Method and route | Purpose |
|---|---|
| `GET /api/runtime` | Declared server profile, host ports, responding instance; not PC hardware detection |
| `GET /api/overview` | Service endpoint connectivity, bounded aggregate diagnostic metrics, actual fault state |
| `GET /api/sessions?page=0&size=50` | Newest sessions; maximum page size 100 |
| `POST /api/sessions` | `{name,scenario}`; four scenario enum values in README |
| `GET /api/sessions/{id}` | Session, activation history, recent evidence plus report citations, report and experiment |
| `PUT /api/sessions/{id}/fault` | Required `{enabled,parameter}`;0–2000 ms parameter; ignored by DB/cache fault implementation |
| `POST /api/sessions/{id}/evidence?phase=BEFORE` | Persist scoped evidence; optional phase AFTER |
| `POST /api/sessions/{id}/rca` | Analyze latest BEFORE evidence and persist cited report |
| `POST /api/sessions/{id}/experiments` | `{vus,durationSeconds}`;1–50 VUs, 5–300 seconds; one experiment per session |
| `GET /api/experiments/{id}` | Stored workload, phase state and measured summaries |
| `POST /api/experiments/{id}/runs` | `{phase:"BEFORE"}` or AFTER; enforces state/fault/lease and unused telemetry phase |
| `POST /api/experiments/{id}/runs/{phase}/complete` | Required counts, actual seconds, p50/p95/p99 and original workload; auto-collects service evidence |
| `GET /api/catalog?category=books` | Demo catalog; categories books/electronics/games/office |
| `POST /api/orders` | Required Idempotency-Key header, `{productId,quantity}` |
| `GET /api/orders/{id}` | Accepted order; does not imply asynchronous fulfillment completion |
| `GET /internal/telemetry?sessionId={id}&phase=BEFORE` | Demo-service diagnostic snapshot; internal contract, local network only |
| `GET /actuator/health`, `/actuator/prometheus` | Backend health and scrape endpoint |

Completion JSON:

```json
{
  "requestCount": 100,
  "errorCount": 0,
  "durationSeconds": 20.5,
  "p50Ms": 10.0,
  "p95Ms": 25.0,
  "p99Ms": 50.0,
  "workload": { "vus": 2, "durationSeconds": 20 }
}
```

These numbers illustrate the schema only; they are not project benchmark results. Scripts produce this object from actual k6 output. Null/missing numeric fields must be rejected rather than interpreted as zero.

Traffic headers: `X-Incident-Id`, `X-Experiment-Phase` (`BEFORE` or `AFTER`), optional `X-Correlation-Id`. Context is sanitized and bounded. W3C trace context is propagated when the agent is enabled. An unscoped baseline is useful for warm-up but is not a stored experiment.

## Execution configuration and timing

New runners submit `configuration` alongside `phase` at run start. The typed configuration includes a SHA-256 hash of actual container images/memory limits/host ports, local instance, profile, optional PC label, canonical control/workload targets and host ports. The receiving instance/declared settings must match; AFTER must use the same configuration as BEFORE. Old clients without configuration retain an explicitly unknown value. New runners refuse unavailable identity APIs and mismatched local targets before any session/fault/load writes.

Experiment responses include `execution.configuration` and BEFORE/AFTER `startedAt` / `endedAt` controlled-run windows. Metrics retain actual k6 `durationSeconds`, including graceful completion. Controlled windows include runner/collection overhead and are not exact first/last business-request timestamps. Nullable V2 columns preserve historical rows without fabricated timing/configuration. No CPU/RAM equivalence across PCs is implied.
