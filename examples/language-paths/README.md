# Catalog/order practice projects

## 한국어 빠른 안내

이 세 언어 프로젝트는 기존 IncidentLens 장애 실험실과 독립된 **로컬 입문 서버**입니다. 각 언어의 실행 도구만 있으면 아래 명령으로 시작하며 기본 주소는 `127.0.0.1:18182`입니다. `GET /products/1`은 가격 1200의 고정 상품을, `POST /orders`는 `Idempotency-Key`와 수량 1–100을 받아 `accepted` 주문을 돌려줍니다. 같은 키/본문의 재요청은 200으로 원래 주문을, 같은 키/다른 본문은 409를 돌려줍니다. 주문은 **프로세스 메모리**에만 있어 재시작하면 사라집니다. DB·인증·worker·실제 분산 멱등성은 아직 없으므로 공개 네트워크에 열거나 실제 데이터를 넣지 마세요. 다음 단계의 SQLite/권한/outbox 실습은 [`advanced/README.md`](advanced/README.md)에 있습니다.

Linux/WSL에서는 표의 `python3`, `node`, `dotnet` 명령을 사용합니다. Windows PowerShell에서는 각각 `python.exe`, `node.exe`, `dotnet.exe`를 사용합니다. 서버 실행 전 다른 프로그램이 포트를 사용하는지 확인하고 기존 프로그램을 종료하지 마세요. 다른 터미널에서 아래 HTTP 상태와 본문을 기록한 뒤 201이 후속 완료가 아님을 설명해 보세요. 실습이 실행되지 않았다면 그 사실을 기록하세요.

These are independent, small **loopback-only learning servers**. They never connect to or mutate IncidentLens at port 18000. Each starts with one fixed product (ID 1, price 1200), and accepts orders only in its own process memory. They demonstrate HTTP, validation, request flow, a small domain function, and same-process idempotency. Restarting loses orders; none has a database, authentication, broker, distributed idempotency or production hardening. Stage 05 onward must add and verify those boundaries separately. Never treat a 201 response as fulfillment.

| Path | Runtime/manifest | Run from its directory | Built-in check |
| --- | --- | --- | --- |
| `python/` | Python 3.12+, standard library | Linux `python3 app.py`; Windows `python.exe app.py` | `python3 -m unittest -v` / `python.exe -m unittest -v` |
| `javascript/` | Node 22+, `package.json`; intro JavaScript; runnable compiled TypeScript is in `advanced/javascript/server.mts` | Linux `node app.mjs`; Windows `node.exe app.mjs` | `node --test` / `node.exe --test` |
| `csharp/` | .NET SDK 8+, `CatalogPractice.csproj`, ASP.NET Core shared framework | Linux `dotnet run`; Windows `dotnet.exe run` | HTTP contract below; no test framework package is included |

The process listens on `127.0.0.1:18182` by default; set `PORT` to a free nonprivileged port if needed. Do not terminate another process occupying that port. In another terminal, use the following HTTP contract (PowerShell users can use `Invoke-RestMethod` with the same method, URL, JSON body and header):

```bash
curl -i http://127.0.0.1:18182/health
curl -i http://127.0.0.1:18182/products/1
curl -i http://127.0.0.1:18182/products/9
curl -i -X POST http://127.0.0.1:18182/orders -H 'Content-Type: application/json' -H 'Idempotency-Key: practice-1' -d '{"productId":1,"quantity":2}'
curl -i http://127.0.0.1:18182/orders/1
```

Expected statuses: health and product 1 → 200, product 9 → 404, first valid order → 201, same key and body again → 200 with the original order, same key with a different body → 409, invalid quantity → 400. The order response reports `accepted`, not fulfilled. Record actual status/body, then explain where state lives and what a restart loses. Do not run more than one practice server on the same port.

Suggested independent extension: add a second product with a test for the missing-product boundary. Then design a durable schema and transaction for order plus outbox before implementing it. Authentication, secure token verification, SQL transactions, metrics, cache and messaging require later stages and additional explicit setup; these starters do not pretend to provide them.
