# Durable order practice / 지속 가능한 주문 실습

Python, JavaScript/TypeScript, C#은 같은 상품·주문 도메인을 입문 메모리 서버에서 SQLite 주문+outbox 트랜잭션, 소유권 검사, 테스트, 로컬 캐시, 별도 worker와 복구까지 확장합니다. 기존 IncidentLens의 Java/MySQL/Redis/Kafka 서버와 연결하지 않습니다. 기본 주소는 `http://127.0.0.1:18183`입니다. 반드시 새 `PRACTICE_DB`를 사용하세요.

These isolated projects use real local SQLite, exercise identities, a bounded 30-second process cache, and a separate polling worker. **SQLite is not MySQL; the cache is not Redis; polling is not Kafka; JSON `/metrics` is not Prometheus or tracing.** Runtime tests and production deployment are separate evidence. Full executed results: [validation](../../../docs/VALIDATION_20261005.md).

| Language | Actual implementation | Reproducible dependency setup | Check |
| --- | --- | --- | --- |
| Python 3.12 | FastAPI 0.115.12, Uvicorn 0.34.2, built-in sqlite3 | `python3 -m venv .venv`, `.venv/bin/python -m pip install -r requirements.lock` | `.venv/bin/python -m unittest -v` |
| Node 22.23.2 / JS | Express 5.1.0, experimental `node:sqlite` | `npm ci` using package-lock.json | `npm test` |
| TypeScript 5.9.3 | Typed server.mts compiled by tsc; same real Express/SQLite implementation | `npm ci`, `npm run build` | `npm run typecheck`, compiled-server HTTP/recovery check below |
| C# / .NET 8 SDK | ASP.NET Core, Microsoft.Data.Sqlite 8.0.0 | `dotnet restore tests/CatalogAdvanced.Tests.csproj --locked-mode` | `dotnet test tests/CatalogAdvanced.Tests.csproj --no-restore` (Store + actual child-process HTTP/recovery) |

Python's complete transitive versions are in requirements.lock. Both C# projects contain packages.lock.json. Use the CI/runtime major versions above. Windows PowerShell uses `python.exe`, `node.exe`, `npm.cmd`, `dotnet.exe`; the Python virtual environment executable is `.\.venv\Scripts\python.exe`. Windows native runtime commands have not been executed in the current verification; browser OS selection checks are distinct.

## Start, stop and recover / 실행·종료·복구

First supply **two distinct random tokens** of at least 24 characters in the server's shell. They map to `alice` and `bob`; they do not implement login, token issuance, signature/expiry checks or OIDC. Keep the server on loopback and use throwaway exercise data. The worker needs only the same DB path, not the tokens.

```bash
export PRACTICE_ALICE_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
export PRACTICE_BOB_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
export PRACTICE_DB="$(pwd)/practice.db"
```

```powershell
$env:PRACTICE_ALICE_TOKEN = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:PRACTICE_BOB_TOKEN = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:PRACTICE_DB = Join-Path (Get-Location) 'practice.db'
```

Run from the chosen language directory. For TS, first run `npm run build`; the compiler emits executable JavaScript and the schema under dist.

| Track | API terminal | Separate worker terminal, same PRACTICE_DB |
| --- | --- | --- |
| Python | `.venv/bin/python -m uvicorn entry:app --host 127.0.0.1 --port 18183` | `.venv/bin/python worker.py` |
| JS | `node api.mjs` | `node worker.mjs` |
| TS | `npm run start:ts` | `node worker.mjs` |
| C# | `dotnet run -- serve` | `dotnet run -- worker` |

1. Leave worker stopped. Send the request below: 201, `accepted`, pending outbox 1.
2. Repeat the same owner/key/body: 200, same order ID. Change quantity under the same key: 409. No token gives 401; bob reading alice's order gives 403.
3. Stop only your API with Ctrl+C; restart using the same DB. Replay remains 200 with the original ID.
4. Start the worker: order becomes `fulfilled`, pending becomes 0. Stop/restart worker: no second processing effect.
5. Compare POST's `X-Request-Id`, API `requestId`, stored `outbox.request_id`, and worker `requestId`, `orderId`, `eventId`. A replay has a new HTTP request ID while retaining the original event's correlation. Tokens never appear in these logs.

```bash
curl -i -X POST http://127.0.0.1:18183/orders \
  -H "Authorization: Bearer $PRACTICE_ALICE_TOKEN" \
  -H 'Idempotency-Key: practice-1' -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}'
```

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:18183/orders' -Headers @{ Authorization = "Bearer $env:PRACTICE_ALICE_TOKEN"; 'Idempotency-Key' = 'practice-1' } -ContentType 'application/json' -Body '{"productId":1,"quantity":2}'
```

The worker commits processed-event dedupe, fulfilled status, and outbox completion in one transaction. A process interruption before commit rolls back; the pending row can be retried. This does not prove broker delivery, DLQ behavior or resilience under unlimited concurrent writers. SQLite busy timeout is five seconds. Product editing/invalidation and signed identity remain independent exercises.

Actual process verification with fresh temporary DB, random tokens and unused ports:

```bash
# Run from advanced/python after dependency setup
.venv/bin/python ../verify_recovery.py python
# Run from advanced/javascript after npm ci and npm run build; requires Python 3
python3 ../verify_recovery.py javascript
python3 ../verify_recovery.py typescript
# Run from advanced/csharp
 dotnet test tests/CatalogAdvanced.Tests.csproj --no-restore
```

Uvicorn 0.34.2 completes lifespan shutdown then re-raises the received signal. The Linux verifier accepts SIGTERM exit only with `Application shutdown complete.` in its log; worker and Node exits must be zero. See [upstream implementation](https://github.com/encode/uvicorn/blob/0.34.2/uvicorn/server.py).

## Schema change and rollback / DB 변경·되돌리기

Stop the practice API and worker. Copy the practice DB to an exercise backup (do not reuse IncidentLens volumes). From `advanced/`, using existing Python 3:

```bash
python3 migrate.py --db /absolute/path/to/practice.db up
# schema version 2: products.description added; price/order rows remain
python3 migrate.py --db /absolute/path/to/practice.db down
# schema version 1: description removed; price/order rows remain
python3 -m unittest -v test_migrate.py
```

PowerShell: use `Copy-Item $env:PRACTICE_DB "$env:PRACTICE_DB.backup"` and `python.exe migrate.py --db $env:PRACTICE_DB up` / `down`. Migration uses an exclusive transaction and refuses missing files or unexpected versions. Downgrade intentionally removes values in the new description column: copy the temporary DB before trying it. This is SQLite schema practice, not Flyway/MySQL rollback verification.

## Learning outcome / 독립 과제

Read the actual route, store and worker files together. Implement a second product, price updates/cache invalidation, parallel duplicate requests and a recoverable worker failure. Submit commands, expected/actual outputs, tests and limits. Choose actual Redis/Kafka only if the workload/recovery requirement warrants them, then verify real dependencies separately. Reading or running the scaffold does not certify independent mastery.
