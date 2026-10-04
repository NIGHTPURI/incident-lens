import type { CodeLanguage } from "./programming-tracks";
import type { Chapter, Copy, PhaseId } from "./language-course";
import { moreCourses } from "./language-course-more";

const b = (ko: string, en: string): Copy => ({ ko, en });
const ch = (intro: Copy, flow: Copy, code: string, codeScope: Copy, failure: Copy, guided: Copy, independent: Copy, source: string): Chapter =>
  ({ intro, flow, code, codeScope, failure, guided, independent, source });
export const courseChapters: Record<Exclude<CodeLanguage, "java">, Record<PhaseId, Chapter>> = {
  python: {
    api: ch(
      b("FastAPI 경로 함수는 HTTP 요청을 Python 함수 인자로 바꿉니다. 상품 ID는 URL 경로 값이고 반환 dict는 JSON이 됩니다. GET은 읽기, 주문 생성은 POST처럼 의도를 나눕니다.", "FastAPI maps an HTTP request to Python function arguments. Product ID comes from the URL and the returned dict becomes JSON. Separate reads (GET) from order creation (POST)."),
      b("GET /products/1 → 경로 매개변수 int 변환 → 상품 조회 함수 → JSON/404. 잘못된 입력과 없는 상품을 다른 상태로 다룹니다.", "GET /products/1 → integer path conversion → product lookup → JSON/404. Invalid input and missing product need distinct statuses."),
      "from fastapi import FastAPI, HTTPException\napp = FastAPI()\n@app.get('/products/{product_id}')\ndef product(product_id: int):\n    if product_id != 1:\n        raise HTTPException(status_code=404, detail='Not found')\n    return {'id': 1, 'price': 1200}",
      b("FastAPI가 설치된 프로젝트의 초점 예시입니다. DB 대신 고정 상품을 사용하며 여기서 실행·검증하지 않았습니다.", "Focused snippet for a project with FastAPI installed. It uses a fixed product instead of a DB and has not been run or verified here."),
      b("서버가 뜨지 않으면 가상 환경·패키지·모듈 경로를, 422면 타입 변환을, 404면 조회 결과를 분리해 확인합니다.", "For startup failure inspect virtual environment, package and module path; for 422 inspect type conversion; for 404 inspect lookup result."),
      b("URL의 ID를 1과 2로 바꿔 예상 상태와 JSON을 손으로 쓰고 코드의 분기와 대조하세요.", "Predict status and JSON for IDs 1 and 2, then compare with code branches."),
      b("POST /orders의 수량 1–100 검증과 잘못된 본문 응답을 설계하세요. 주문 접수와 후속 완료는 분리해 표현하세요.", "Design quantity 1–100 validation and invalid-body responses for POST /orders. Separate accepted from fulfilled."),
      "https://fastapi.tiangolo.com/tutorial/first-steps/"),
    db: ch(
      b("고정 dict는 재시작 후 주문을 보관하지 못합니다. Python에서는 SQLAlchemy 세션과 관계형 DB를 사용해 상품을 읽고 주문·발행 의도를 같은 트랜잭션에 넣을 수 있습니다.", "A fixed dict cannot persist orders. SQLAlchemy sessions and a relational DB can read products and commit order plus publication intent together."),
      b("HTTP ID → 서비스 → Session.get(Product,id) → 없으면 404 → 주문·outbox 추가 → commit → 접수 응답. 조회와 쓰기 실패 경계를 따로 둡니다.", "HTTP ID → service → Session.get(Product,id) → 404 if missing → add order/outbox → commit → accepted response. Separate read and write failure boundaries."),
      "with Session(engine) as db:\n    product = db.get(Product, product_id)\n    if product is None: raise NotFound()\n    db.add(Order(product_id=product.id, quantity=2))\n    db.add(OutboxEvent(kind='OrderCreated'))\n    db.commit()",
      b("SQLAlchemy 모델·엔진·예외 정의를 생략한 초점 코드입니다. 드라이버/DB/마이그레이션이 필요하며 실행 결과를 주장하지 않습니다.", "Focused code omitting SQLAlchemy models, engine and exception definition. It needs a driver, DB and migrations; no run is claimed."),
      b("연결 실패는 URL/DB 상태를, 중복 주문은 unique key와 idempotency 규칙을, 반쪽 저장은 두 add가 같은 세션·커밋인지 확인합니다.", "For connection failures inspect URL/DB; for duplicates unique key/idempotency; for partial writes verify both adds share one session and commit."),
      b("상품 없음, 두 번째 INSERT 실패, commit 성공을 표로 만들고 각각 남는 행을 예측하세요.", "Make a table for missing product, second INSERT failure and successful commit; predict persisted rows."),
      b("같은 주문 키의 동시 요청 둘을 처리할 DB 제약과 200/201/409 규칙을 설계하세요.", "Design DB constraint and 200/201/409 rules for two concurrent requests sharing an order key."),
      "https://docs.sqlalchemy.org/en/20/orm/session_basics.html"),
    auth: ch(
      b("주문 조회는 '누구인가'와 '그 주문을 볼 수 있는가'를 나눠야 합니다. FastAPI 의존성은 요청에서 인증된 사용자를 얻는 경계로 쓸 수 있습니다.", "Order lookup must separate who the caller is from whether they may view this order. A FastAPI dependency can resolve the authenticated user."),
      b("Authorization 헤더 → 서명·만료·발급자·대상 검증 → 사용자 ID → 주문 소유자 비교 → 401/403/200. 값이 없다고 익명 주문으로 처리하지 않습니다.", "Authorization header → verify signature, expiry, issuer and audience → user ID → compare order owner → 401/403/200. Missing identity must not become an anonymous order."),
      "def require_user(token = Depends(oauth2_scheme)):\n    claims = verify_token_signature_expiry_issuer_audience(token)\n    return claims['sub']\n# then require order.owner_id == user_id",
      b("보안 경계를 나타내는 의사 코드입니다. verify 함수, 키 관리, 토큰 발급은 제공되지 않아 실행 가능한 인증 구현이 아닙니다.", "Security-boundary pseudocode. Verification, key management and issuance are not supplied; this is not runnable authentication."),
      b("401은 토큰 없음/무효, 403은 인증됐지만 소유권 없음입니다. 토큰 문자열을 로그나 오류 응답에 넣지 마세요.", "401 is missing/invalid token; 403 is authenticated but unauthorized. Never log or return the token."),
      b("자신의 주문·타인의 주문·만료 토큰 세 경우에 어떤 검사를 먼저 할지 순서도를 만드세요.", "Draw the checks for own order, someone else's order and expired token."),
      b("URL에 주문 ID만 바꾸면 남의 주문이 보이는 결함을 막는 서비스·DB 조회 규칙을 작성하세요.", "Write service/DB lookup rules preventing access to another user's order by changing the URL ID."),
      "https://fastapi.tiangolo.com/tutorial/security/first-steps/"),
    tests: ch(
      b("함수 호출만 시험하면 HTTP 상태·JSON 변환과 DB 롤백이 빠집니다. Python에서는 pytest의 작은 규칙 테스트와 FastAPI TestClient의 요청 테스트를 분리합니다.", "Function-only checks miss HTTP status/JSON conversion and DB rollback. Separate small pytest rule tests from FastAPI TestClient request tests."),
      b("테스트 입력 → 격리 앱/DB → HTTP 또는 서비스 호출 → 상태·본문·DB 불변식 확인. 실제 네트워크/운영 DB를 검증했다고 쓰지 않습니다.", "Test input → isolated app/DB → HTTP or service call → assert status/body/DB invariants. Do not claim production network/DB coverage."),
      "def test_missing_product(client):\n    response = client.get('/products/999')\n    assert response.status_code == 404\n# client fixture must provide TestClient(app)",
      b("pytest·TestClient와 client fixture가 필요한 초점 테스트입니다. fixture와 실행 환경은 아직 제공되지 않아 이 저장소에서 돌린 결과가 아닙니다.", "Focused test needing pytest, TestClient and a client fixture. They are not provided or run by this repository."),
      b("예상 404가 200이면 경로가 고정값을 반환하는지, 다른 DB를 보고 있는지, fixture가 상태를 공유하는지 봅니다.", "If expected 404 becomes 200, inspect hardcoded routes, wrong DB and leaking fixture state."),
      b("정상 상품과 없는 상품의 HTTP 계약을 먼저 두 개 작성하세요.", "Write two HTTP contracts for existing and missing product."),
      b("동일 주문 키 재요청과 outbox INSERT 실패를 시험할 때 어떤 DB 행 수 불변식을 검사할지 설계하세요.", "Design DB row-count invariants for idempotent replay and failed outbox insert."),
      "https://fastapi.tiangolo.com/tutorial/testing/"),
    deployment: ch(
      b("개발 노트북에서 동작하는 코드와 운영 가능 서비스는 다릅니다. 실행 프로세스, 환경 변수, 비밀, 포트, health, 로그, DB 마이그레이션과 롤백이 필요합니다.", "Code running on a laptop is not an operable service. Plan process, environment, secrets, ports, health, logs, DB migration and rollback."),
      b("배포물 준비 → 검증된 설정/비밀 주입 → schema 적용 → 앱 시작/readiness → 트래픽 전환 → 오류·지연 관측 → 문제 시 롤백.", "Prepare artifact → inject validated config/secrets → apply schema → start/readiness → route traffic → observe errors/latency → rollback if needed."),
      "python -m uvicorn app:app --host 127.0.0.1 --port 8000\n# local example; production process/proxy/TLS need design",
      b("Python·uvicorn·FastAPI가 설치된 프로젝트의 로컬 실행 형태입니다. 이 저장소에 Python 서비스나 배포 파이프라인은 없고 명령을 실행하지 않았습니다.", "Local command shape for a project with Python, uvicorn and FastAPI. This repo has no Python service/deployment pipeline; it was not run."),
      b("시작 실패는 import/패키지/환경을, 502는 프록시↔프로세스를, 배포 뒤 DB 오류는 schema 버전과 연결을 확인합니다.", "For startup check imports/packages/env; for 502 proxy↔process; for post-deploy DB errors schema version and connectivity."),
      b("health와 readiness가 무엇을 확인하고 무엇을 보장하지 못하는지 적으세요.", "State what health/readiness check and what they cannot guarantee."),
      b("새 필수 DB 컬럼을 추가할 때 이전 앱 버전이 잠시 공존해도 가능한 migration·rollback 순서를 설계하세요.", "Design migration/rollback for a new required DB column while old and new app versions coexist."),
      "https://fastapi.tiangolo.com/deployment/"),
  },
  javascript: {
    api: ch(
      b("Node.js는 JavaScript 런타임이고 Express는 HTTP 경로와 미들웨어를 조합합니다. TypeScript는 별도 타입 검사/실행 설정이 필요합니다.", "Node.js runs JavaScript; Express composes HTTP routes and middleware. TypeScript requires separate type-check/run setup."),
      b("GET /products/1 → Express route의 req.params.id → 숫자/존재 검증 → res.status(...).json(...). next(err)는 공통 오류 경계로 전달합니다.", "GET /products/1 → Express route req.params.id → number/existence validation → res.status(...).json(...). next(err) passes to an error boundary."),
      "app.get('/products/:id', (req, res) => {\n  const id = Number(req.params.id);\n  if (!Number.isInteger(id)) return res.status(400).json({error:'id'});\n  if (id !== 1) return res.status(404).json({error:'missing'});\n  return res.json({id, price:1200});\n});",
      b("Express가 설치된 CommonJS/JavaScript 프로젝트의 경로 초점 코드입니다. app 생성·실행은 생략했고 이 저장소에서 검증하지 않았습니다.", "Focused Express JavaScript route; app setup/start is omitted and this repository has not run it."),
      b("400/404/500을 구분하고 async handler의 거부된 Promise가 오류 미들웨어로 전달되는지 프레임워크 버전과 코드에서 확인합니다.", "Separate 400/404/500 and inspect whether rejected async handlers reach error middleware for the chosen Express version."),
      b("문자 ID, 없는 정수 ID, 존재 ID의 결과를 예측하세요.", "Predict results for a nonnumeric ID, missing integer ID and existing ID."),
      b("POST /orders 입력 형식과 오류 JSON 계약을 정의하고 응답 201이 후속 worker 완료를 뜻하지 않게 하세요.", "Define POST /orders body/error JSON and ensure 201 does not imply worker completion."),
      "https://expressjs.com/en/guide/routing.html"),
    db: ch(
      b("메모리 배열 대신 관계형 DB에 주문을 저장합니다. Node의 pg Pool은 PostgreSQL 연결을 재사용하고 매개변수 바인딩으로 SQL 값과 입력을 분리합니다.", "Persist orders in a relational DB rather than an array. Node pg Pool reuses PostgreSQL connections and parameter binding separates SQL from input."),
      b("POST 입력 검증 → pool.connect → BEGIN → order/outbox INSERT → COMMIT → 201. 하나라도 실패하면 ROLLBACK 후 연결을 반환합니다.", "Validate POST → pool.connect → BEGIN → insert order/outbox → COMMIT → 201. On failure ROLLBACK and release the connection."),
      "const client = await pool.connect();\ntry {\n  await client.query('BEGIN');\n  await client.query('INSERT INTO orders(id) VALUES($1)', [orderId]);\n  await client.query('INSERT INTO outbox(order_id) VALUES($1)', [orderId]);\n  await client.query('COMMIT');\n} catch (e) { await client.query('ROLLBACK'); throw e; }\nfinally { client.release(); }",
      b("pg 패키지·Pool·schema/DB가 필요한 초점 코드입니다. 실제 schema에는 더 많은 컬럼/제약이 필요하며 실행하지 않았습니다.", "Focused code requiring pg, Pool and a DB/schema. A real schema needs more columns/constraints; it has not run."),
      b("한 pool.query씩 트랜잭션을 만들면 서로 다른 연결을 쓸 수 있습니다. 같은 client를 쓰는지, rollback과 release가 모든 경로에서 일어나는지 봅니다.", "Separate pool.query calls may use different connections. Check use of one client, rollback and release on every path."),
      b("두 INSERT 중 둘째가 실패하면 남는 행과 HTTP 결과를 예측하세요.", "Predict rows and HTTP outcome when the second INSERT fails."),
      b("중복 키 동시 주문의 unique index와 replay/409 분기를 설계하세요.", "Design a unique index and replay/409 branch for concurrent duplicate keys."),
      "https://node-postgres.com/features/transactions"),
    auth: ch(
      b("Express 미들웨어에서 신원 확인을 하고 주문 라우트에서 소유권을 확인합니다. TypeScript 타입은 런타임 인증을 대신하지 않습니다.", "Authenticate identity in Express middleware and check order ownership in the route. TypeScript types do not replace runtime authentication."),
      b("Bearer 토큰 추출 → 서명·만료·issuer·audience 검증 → req.user 설정 → order.owner_id와 비교 → 401/403/200.", "Extract Bearer token → verify signature, expiry, issuer and audience → set req.user → compare order.owner_id → 401/403/200."),
      "const { payload } = await jwtVerify(token, verificationKey, {\n  issuer: expectedIssuer, audience: expectedAudience\n});\nreq.user = { id: payload.sub };\n// route must also verify order.owner_id === req.user.id",
      b("jose의 jwtVerify를 중심으로 한 설계 조각입니다. 키/토큰 취득·타입 확장·오류 처리·라우트 보호가 빠져 있어 실행 가능한 인증이 아닙니다.", "Design fragment around jose jwtVerify. Key/token retrieval, types, errors and route protection are omitted; this is not runnable auth."),
      b("서명 검증만 하고 audience/issuer를 빼면 다른 용도 토큰을 받을 수 있습니다. 401과 소유권 403을 구분하고 비밀을 로그에 남기지 않습니다.", "Signature alone can accept a token for another audience/issuer. Separate 401 from ownership 403 and never log secrets."),
      b("토큰 없음/만료/타인 주문 세 경우의 응답과 로그에 남길 안전한 필드를 표로 만드세요.", "Tabulate responses and safe log fields for missing/expired token and another user's order."),
      b("미들웨어를 한 라우트에서 빠뜨리는 경우를 막을 라우팅 구조와 테스트를 설계하세요.", "Design routing and tests to catch a route that omits auth middleware."),
      "https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md"),
    tests: ch(
      b("계산 함수 테스트만으로 Express 라우팅·JSON·DB rollback을 확인할 수 없습니다. Node 내장 test runner와 HTTP test helper를 서로 다른 경계에 사용합니다.", "Calculation tests alone miss Express routing, JSON and DB rollback. Use Node's test runner and an HTTP test helper at distinct boundaries."),
      b("격리 앱과 테스트 DB → HTTP 요청 → status/body → 저장된 order/outbox 행 확인. 외부 Kafka/운영 DB 통과라고 주장하지 않습니다.", "Isolated app and test DB → HTTP request → status/body → check order/outbox rows. Do not claim external Kafka/production DB coverage."),
      "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('price math', () => {\n  assert.equal(1200 * 2, 2400);\n});",
      b("이 조각은 Node 내장 test runner에서 실행 가능한 작은 규칙 예시지만 여기서 실행하지 않았습니다. HTTP/DB 테스트는 별도 fixture가 필요합니다.", "This small rule sample is shaped for Node's built-in runner but was not run here. HTTP/DB tests need separate fixtures."),
      b("테스트 순서에 따라 결과가 바뀌면 전역 상태와 DB 격리를, 201만 확인했다면 실제 order/outbox 불변식을 봅니다.", "If order changes results, inspect global state/DB isolation; if only 201 was asserted, inspect order/outbox invariants."),
      b("작은 계산의 단위 테스트와 없는 상품의 HTTP 테스트가 각각 검출할 결함을 적으세요.", "State which defect a unit math test and missing-product HTTP test each catch."),
      b("outbox 실패 후 롤백, 같은 키 재요청, 만료된 토큰의 계약 테스트를 설계하세요.", "Design contract tests for outbox rollback, idempotent replay and expired token."),
      "https://nodejs.org/api/test.html"),
    deployment: ch(
      b("Node 앱도 빌드/실행 버전, 환경·비밀, 프로세스 수, graceful shutdown, readiness, DB schema와 롤백을 계획해야 합니다. TypeScript라면 컴파일/타입 검사 경계를 더 확인합니다.", "Node apps need runtime/build version, env/secrets, process count, graceful shutdown, readiness, DB schema and rollback. TypeScript adds type-check/build boundaries."),
      b("잠근 의존성 설치·검사 → artifact 준비 → DB migration → 환경 주입 → process/readiness → 트래픽 전환 → 오류·지연 감시.", "Install locked dependencies/check → artifact → DB migration → inject env → process/readiness → route traffic → watch errors/latency."),
      "node server.js\n# illustrative local start; TypeScript source needs its chosen build/run workflow",
      b("완성 server.js/lockfile/배포 환경은 제공되지 않습니다. 설치·실행하지 않았고 프록시·TLS·비밀 보관은 별도 설계입니다.", "No complete server.js/lockfile/deployment is supplied. Nothing was installed or run; proxy/TLS/secrets need separate design."),
      b("시작 실패는 Node 버전·모듈 방식(CommonJS/ESM)·환경을, 502는 프록시/프로세스, 연결 누수는 Pool과 shutdown을 확인합니다.", "For startup check Node version, CommonJS/ESM and env; for 502 proxy/process; for leaks Pool and shutdown."),
      b("SIGTERM 때 새 요청 수락을 멈추고 진행 중인 요청·DB 연결을 어떻게 마칠지 적으세요.", "Describe stopping new requests and finishing in-flight work/DB connections on SIGTERM."),
      b("TypeScript 빌드된 서버와 이전 버전이 동시에 있을 때 호환 가능한 schema 배포/롤백 순서를 설계하세요.", "Design schema rollout/rollback while old and new TypeScript-built servers coexist."),
      "https://nodejs.org/en/learn/command-line/how-to-run-nodejs-scripts-from-the-command-line"),
  },
  ...moreCourses,
};
