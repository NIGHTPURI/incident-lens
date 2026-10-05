# Backend learning outcomes / 백엔드 학습 결과

Active paths: **Java, Python, JavaScript/TypeScript, C#**. Every path connects foundations → HTTP/API → persistence/transactions → identity/access → testing → operations → cache → concurrency/idempotency → async work → failure/recovery. Java retains its original fifteen-stage material. Three other paths use language-specific introductions, fifteen-stage chapters and independent practice, with actual intro and advanced projects. Matching titles or read marks do not certify independent competence.

| Stage | Observable outcome | Actual language-specific practice |
| --- | --- | --- |
| 01 Tools | Locate code, check runtime, process/port and shell | Python 3.12, Node 22, .NET 8; Windows/PowerShell and Linux/Bash instructions |
| 02 Basics | Types, functions, collection, validation and exceptions | Python strict int/bool boundary; JS integer checks and compiled TS types; C# DTO binding and range checks |
| 03 HTTP | Methods, paths, JSON, 200/400/404 and acceptance | Dependency-free loopback intro APIs; same catalog/order contract |
| 04 API structure | Separate route, validation, domain and response | FastAPI/Pydantic, Express, ASP.NET Core; framework-specific 400/422/404 contracts |
| 05 Persistence | Durable rows, keys, schema and restart | sqlite3, node:sqlite, Microsoft.Data.Sqlite; schema.sql, migration up/down with data-preservation tests |
| 06 Transactions | Atomic order+outbox, commit/rollback | Failure injection immediately after INSERT; no orphan order/outbox; real SQLite store tests |
| 07 Identity/access | 401 vs 403, owner boundary, secrets | Local token-to-owner fixture; actual HTTP tests, explicit absence of login/signature/expiry/OIDC |
| 08 Tests | Check pure rules, HTTP and storage invariants | Per-language store/cache/API suites plus actual process recovery; C# HTTP child-process test |
| 09 Collaboration/CI | Reproducible checks and reviewable evidence | requirements.lock, package-lock.json, packages.lock.json; three language CI jobs |
| 10 Operations | Start/stop/restart, config, health, rollback | New DB/unused loopback port, graceful signal handling, replay after restart; no production deployment |
| 11 Observability | Correlate HTTP request and later worker work | X-Request-Id → outbox.request_id → worker requestId/orderId/eventId; local JSON scope |
| 12 Cache | TTL, source reads, staleness and alternatives | Bounded process-local product cache and expiry tests; real Redis guide links |
| 13 Concurrency | One stored effect per owner/key; replay/409 | SQLite transaction + unique constraint, persisted replay; busy timeout and multi-server limits explicit |
| 14 Async work | Accepted vs fulfilled, dedupe and recovery | Separate SQLite poller commits processed-event/status/outbox atomically; restart check; real Kafka guide links |
| 15 Independent project | Build, test, recover and explain boundaries | Second product, price/cache invalidation, concurrent replay, denied access and worker failure; actual evidence required |

The language lesson's “boundary to follow in this project” connects its route/store/worker to actual IncidentLens Java source. Every corresponding stage links actual lab technology guides. The fourteen guides explain what each tool is, the problem it addresses, purpose, actual use, failure diagnosis and when simpler alternatives suffice. [Stack coverage](LEARNING_STACK_COVERAGE.md) distinguishes core from optional Compose profiles.

## Execution status

**Authored** means source/lesson exists. **Runnable** means complete files and fixed setup are supplied. **Verified** applies only to checks actually run and recorded in [2026-10-05 validation](VALIDATION_20261005.md). No UI automatically certifies execution or mastery. Read marks and self-review are saved independently per language; Java's existing progress remains compatible.

- Python: real FastAPI/SQLite API/store/cache and separate-process restart/recovery checks, using a temporary Linux container with Python 3.12.12.
- JavaScript/TypeScript: actual Node 22.23.2 HTTP, SQLite/cache checks, tsc compilation/type checking and execution of `dist/server.mjs`, including worker/restart/log correlation.
- C#: real .NET 8.0.425 build/store/cache/identity and actual HTTP/restart/worker tests in a temporary Linux SDK container.
- Java: full backend unit/build and isolated actual MySQL/Redis/Kafka Testcontainers checks; H2 RCA regression is also recorded separately.
- Native Windows commands, production rollout, signed identity, price-edit invalidation and unlimited multi-process SQLite contention are not claimed as verified. Browser checks of Windows/Linux content are not runtime verification of Windows.

Local SQLite/cache/polling success does not establish actual MySQL/Redis/Kafka integration for another language. The existing Java fault lab supplies those real dependency boundaries. No paid provider calls or production deployment occurred.
