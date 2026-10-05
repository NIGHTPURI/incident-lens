import type { CodeLanguage } from './programming-tracks';
import type { Chapter, Copy, PhaseId } from './language-course';
import { courseChapters } from './language-course-data';

export const languageStages = [
  ['tools', '01 · 파일에서 실행까지', '01 · Files to execution'],
  ['basics', '02 · 언어 기초와 오류', '02 · Language basics and errors'],
  ['http', '03 · HTTP 요청과 응답', '03 · HTTP requests and responses'],
  ['api', '04 · API 경계와 구조', '04 · API boundaries and structure'],
  ['persistence', '05 · 지속되는 데이터', '05 · Durable data'],
  ['transactions', '06 · 트랜잭션과 데이터 접근', '06 · Transactions and data access'],
  ['security', '07 · 인증과 권한', '07 · Identity and access'],
  ['testing', '08 · 테스트와 디버깅', '08 · Testing and debugging'],
  ['collaboration', '09 · 협업과 CI', '09 · Collaboration and CI'],
  ['operations', '10 · 실행과 배포', '10 · Operations and deployment'],
  ['observability', '11 · 관측과 원인 분석', '11 · Observability and RCA'],
  ['performance', '12 · 성능과 캐시', '12 · Performance and cache'],
  ['concurrency', '13 · 동시성과 멱등성', '13 · Concurrency and idempotency'],
  ['messaging', '14 · 비동기와 메시징', '14 · Async and messaging'],
  ['capstone', '15 · 독립 프로젝트', '15 · Independent project'],
] as const;
export type LanguageStage = typeof languageStages[number][0];
type Track = Exclude<CodeLanguage, 'java'>;
type Detail = {
  prerequisite: Copy; glossary: Copy; intro: Copy; flow: Copy; failure: Copy;
  guided: Copy; independent: Copy; hint: Copy; solution: Copy; criteria: Copy; tradeoffs: Copy;
};
const b = (ko: string, en: string): Copy => ({ ko, en });

const extra: Record<Exclude<LanguageStage, 'api'|'persistence'|'security'|'testing'|'operations'>, Detail> = {
  tools: {
    prerequisite: b('사전 지식 없음. 명령은 새 연습 폴더에서 실행하며 기존 실험실 서비스에 연결하지 않습니다.', 'No prior knowledge. Run commands in a new practice folder; do not connect to the existing fault lab.'),
    glossary: b('파일은 저장된 데이터, 프로세스는 실행 중인 프로그램, 포트는 요청을 받는 번호, 환경 변수는 프로세스에 전달하는 설정입니다.', 'A file stores data; a process is a running program; a port identifies a service; an environment variable supplies process configuration.'),
    intro: b('편집기에서 코드를 읽는 것과 터미널에서 실행하는 것은 다릅니다. 현재 폴더를 확인한 뒤 해당 언어 도구 버전을 확인하세요. 설치되지 않았다면 읽기부터 진행합니다.', 'Reading code in an editor differs from running it in a terminal. Check your working directory and runtime version. If unavailable, continue by reading.'),
    flow: b('현재 폴더 → 소스 파일 경로 → 언어 도구 → 프로세스 → 표준 출력. 상대 경로는 현재 폴더에 따라 달라집니다.', 'Working directory → source path → language tool → process → standard output. Relative paths depend on the working directory.'),
    failure: b('파일을 못 찾으면 먼저 현재 폴더와 파일 이름을 확인합니다. 명령을 못 찾으면 PATH와 실제 설치 여부를 구별합니다. 포트 충돌 때는 다른 프로세스를 끄지 말고 소유자를 확인하세요.', 'For a missing file, check the working directory and spelling. For an unknown command, distinguish PATH from installation. If a port is occupied, identify its owner rather than stopping it.'),
    guided: b('연습 프로젝트 README에서 해당 언어 폴더와 실행 명령을 찾고, 도구 버전·파일 목록·예상 출력 경로를 적으세요.', 'Find your track folder and run command in the practice README; record tool version, files and where output should appear.'),
    independent: b('다른 폴더에서 같은 상대 경로를 쓰면 왜 실패하는지 보여 주고 절대 경로나 올바른 현재 폴더로 고치세요.', 'Show why a relative path fails from another directory and fix it with an absolute path or correct working directory.'),
    hint: b('프로그램보다 먼저 셸이 파일 경로를 해석합니다.', 'The shell resolves a file path before the program can run.'),
    solution: b('현재 폴더와 파일이 실제로 있는 폴더가 다르면 상대 경로는 달라집니다. cd로 위치를 맞추거나 경로를 명시하세요.', 'A relative path changes when the working directory changes. Move to the intended directory or provide the full path.'),
    criteria: b('파일·프로세스·포트·환경 변수를 구분하고 실제 버전 확인 또는 미설치 상태를 정직하게 기록합니다.', 'Distinguish file, process, port and environment variable, and honestly record the runtime version or its absence.'),
    tradeoffs: b('초기에는 터미널 한두 명령이면 충분합니다. 자동 설치 스크립트는 버전·권한·저장 경로를 이해한 뒤 사용합니다.', 'A couple of terminal commands are enough initially. Use automated installers only after understanding version, permissions and destination.'),
  },
  basics: {
    prerequisite: b('1단계의 파일과 실행 개념. 언어 런타임이 없으면 코드와 예상 결과를 먼저 비교합니다.', 'Stage 1 files and execution. If the runtime is absent, compare source with expected behavior first.'),
    glossary: b('변수는 이름 붙인 값, 타입은 값의 종류, 함수는 입력을 결과로 바꾸는 동작, 오류는 정상 결과로 포장하면 안 되는 경우입니다.', 'A variable names a value; a type classifies it; a function maps input to output; an error must not be disguised as success.'),
    intro: b('가격 1200과 수량으로 합계를 계산합니다. 값·조건·함수를 익히고 수량 0을 거부하는 규칙을 분리하세요. 주문 전체를 만들기 전에 작은 규칙부터 검증합니다.', 'Calculate a total from price 1200 and quantity. Learn values, conditions and functions; isolate the rule rejecting quantity zero. Verify small rules before building an order flow.'),
    flow: b('입력 수량 → 타입/범위 확인 → 가격 곱셈 → 합계 반환. 출력은 반환값과 별도입니다.', 'Input quantity → type/range check → multiply price → return total. Printing is separate from returning.'),
    failure: b('문자 수량이나 0이 들어오면 타입/범위 검사 위치를 확인합니다. 정수 범위를 넘어서는 계산은 언어마다 다르게 실패하거나 정밀도를 잃을 수 있습니다.', 'For a string or zero quantity, check type and range validation. Arithmetic overflow or precision loss differs by language.'),
    guided: b('1, 2, 0의 예상 합계/오류를 적고 실제 함수 분기와 비교하세요.', 'Predict totals/errors for 1, 2 and 0, then compare with the function branches.'),
    independent: b('할인율 없이 수량 1–100만 허용하는 total 함수를 작성하고 경계값 0, 1, 100, 101을 검사하세요.', 'Write total with quantity 1–100 and no discount; check boundaries 0, 1, 100 and 101.'),
    hint: b('검증을 곱셈보다 먼저 두고 0/101에 정상 합계를 반환하지 마세요.', 'Validate before multiplication and do not return a normal total for 0 or 101.'),
    solution: b('범위 밖이면 오류를 반환/발생시키고 범위 안이면 1200×수량을 반환합니다. 1→1200, 100→120000입니다.', 'Return/raise an error outside the range; otherwise return 1200×quantity. 1→1200 and 100→120000.'),
    criteria: b('네 경계값을 독립적으로 확인하고 언어의 오류 경로를 설명할 수 있습니다.', 'Check all four boundary values independently and explain your language’s error path.'),
    tradeoffs: b('정수 원 단위는 이 예시에 편하지만 실제 통화·세금·반올림 정책은 도메인에서 명시해야 합니다.', 'Integer currency units simplify this example; real currency, tax and rounding policies need explicit domain rules.'),
  },
  http: {
    prerequisite: b('2단계의 함수·오류와 URL의 대략적인 의미.', 'Stage 2 functions/errors and a rough idea of URLs.'),
    glossary: b('요청은 클라이언트의 메시지, 응답은 서버의 결과입니다. 메서드는 의도, 경로는 자원, 상태 코드는 결과 종류, JSON은 데이터 형식입니다.', 'A request comes from a client; a response is the server result. Method conveys intent, path selects a resource, status classifies the outcome, and JSON encodes data.'),
    intro: b('연습 서버의 GET /products/1을 따라가며 브라우저·서버·본문·상태 코드를 구분합니다. GET은 조회이고 POST /orders는 상태를 만드는 요청입니다.', 'Trace GET /products/1 in the practice server. Separate browser, server, body and status. GET reads; POST /orders changes state.'),
    flow: b('클라이언트 → 127.0.0.1:18182 → 경로 분기 → 상품 찾기 → 상태/JSON 응답. /products/9는 존재하지 않아 404입니다.', 'Client → 127.0.0.1:18182 → route dispatch → product lookup → status/JSON response. /products/9 does not exist and returns 404.'),
    failure: b('연결 거부는 서버/포트를, 404는 경로/자원을, 400은 입력을 먼저 확인하세요. JSON 본문이 없어도 상태 코드를 200으로 바꾸지 않습니다.', 'For connection refused check process/port; for 404 path/resource; for 400 input. Do not turn an error into 200 merely because the body is JSON.'),
    guided: b('연습 서버를 별도 포트에서 실행한 뒤 health, 상품 1, 상품 9의 상태와 본문을 기록하세요. 기존 18000 서비스는 건드리지 않습니다.', 'Run the practice server on a separate port and record status/body for health, product 1 and product 9. Leave the existing 18000 service untouched.'),
    independent: b('상품 경로에 문자를 넣었을 때의 계약을 정하고 실제 응답과 비교하세요. 왜 서버에 입력 검증이 필요한지 설명하세요.', 'Define the contract for a nonnumeric product path, compare with the actual response, and explain server-side validation.'),
    hint: b('네트워크 실패와 HTTP 오류는 다릅니다. 응답을 받았는지부터 확인합니다.', 'A network failure differs from an HTTP error. First check whether you received a response.'),
    solution: b('연습 서버는 모르는 상품 경로를 404로 돌립니다. 더 엄격한 API라면 잘못된 형식에 400을 정하고 경로 파서를 추가할 수 있습니다.', 'The starter returns 404 for unknown product paths. A stricter API could define 400 for malformed IDs and add path validation.'),
    criteria: b('200/400/404와 연결 거부를 구분해 요청·응답 예시를 기록합니다.', 'Record request/response examples and distinguish 200, 400, 404 and connection refusal.'),
    tradeoffs: b('로컬 연습 서버는 HTTP 기본을 보이지만 TLS, 인증, 공개 배포를 제공하지 않습니다.', 'The local server illustrates HTTP basics but has no TLS, authentication or public deployment.'),
  },
  transactions: {
    prerequisite: b('5단계의 행·기본키·지속성과 주문 접수 흐름.', 'Stage 5 rows, keys, durability and order acceptance flow.'),
    glossary: b('트랜잭션은 함께 성공하거나 실패할 변경 묶음입니다. commit은 확정, rollback은 취소, outbox는 나중에 발행할 의도를 같은 DB에 적은 행입니다.', 'A transaction groups changes that succeed or fail together. Commit confirms, rollback cancels, and an outbox row records publication intent in the same database.'),
    intro: b('주문 행만 저장하고 이벤트 발행 의도를 잃으면 worker는 작업을 모릅니다. 같은 DB 트랜잭션에 order와 outbox를 넣는 이유를 배우세요. 연습 서버의 메모리 저장은 DB 트랜잭션이 아닙니다.', 'If an order row persists but publication intent is lost, the worker will not know about it. Learn why order and outbox belong in one DB transaction. The starter’s in-memory update is not a DB transaction.'),
    flow: b('입력 검증 → DB 연결/트랜잭션 시작 → order INSERT → outbox INSERT → commit → 201. 어느 INSERT가 실패해도 rollback하고 오류를 응답합니다.', 'Validate → acquire DB connection/begin transaction → insert order → insert outbox → commit → 201. Roll back and return an error if either insert fails.'),
    failure: b('첫 INSERT 후 두 번째가 실패했는데 주문이 남으면 다른 연결/자동 커밋을 의심하세요. commit 전에 201을 보내면 성공을 거짓으로 약속할 수 있습니다.', 'If an order survives a failed second insert, inspect connection ownership or autocommit. Sending 201 before commit can falsely promise success.'),
    guided: b('기존 5단계 DB 조각에서 연결·시작·두 쓰기·commit/rollback의 위치를 표시하세요.', 'Mark connection, begin, both writes, commit and rollback in the stage-5 DB fragment.'),
    independent: b('두 번째 INSERT 실패와 commit 성공 두 경우에 남는 행 수와 HTTP 결과를 예측하고 격리 DB 테스트를 설계하세요.', 'Predict rows and HTTP outcomes for a failed second insert and a successful commit; design an isolated DB test.'),
    hint: b('두 쓰기가 같은 트랜잭션을 쓰는지 확인합니다.', 'Verify both writes use the same transaction.'),
    solution: b('두 번째 쓰기가 실패하면 rollback 후 order/outbox 모두 0행이어야 합니다. commit 성공이면 각각 1행이고 그 후 201을 보낼 수 있습니다.', 'On second-write failure, rollback leaves zero order/outbox rows. On commit, each has one row; only then may the API return 201.'),
    criteria: b('두 실패 경계의 DB 불변식을 적고 실제 드라이버/DB 검증 필요 여부를 명시합니다.', 'State DB invariants for both boundaries and whether a real driver/DB check has been performed.'),
    tradeoffs: b('outbox는 DB와 브로커의 원자적 commit을 피하지만 relay 재시도·중복 처리 비용이 생깁니다.', 'An outbox avoids an atomic DB+broker commit, but adds relay retries and duplicate-handling work.'),
  },
  collaboration: {
    prerequisite: b('8단계의 테스트 명령과 Git의 기본 저장소 개념.', 'Stage 8 test command and basic Git repository concepts.'),
    glossary: b('브랜치는 작업 계열, 리뷰는 변경 검토, CI는 공유 환경의 자동 검사, 잠금 파일은 의존성 버전을 재현하기 위한 기록입니다.', 'A branch is a line of work, review examines changes, CI runs checks in a shared environment, and a lockfile records reproducible dependency versions.'),
    intro: b('혼자 통과한 테스트만으로 다른 환경의 성공을 보장하지 못합니다. 재현 가능한 명령, 작은 변경, 실패 로그와 리뷰 기준을 갖춥니다.', 'Passing tests on one machine does not guarantee success elsewhere. Use reproducible commands, small changes, failure logs and review criteria.'),
    flow: b('작업 브랜치 → 변경 diff → 언어별 검사 → 리뷰 → CI 재실행 → 병합 판단. CI 비밀과 로그를 분리합니다.', 'Work branch → change diff → language-specific checks → review → CI rerun → merge decision. Keep CI secrets out of logs.'),
    failure: b('로컬은 통과하고 CI가 실패하면 런타임 버전·작업 폴더·환경 변수·시간/순서 의존성을 비교합니다.', 'If local passes and CI fails, compare runtime version, working directory, environment variables and time/order assumptions.'),
    guided: b('연습 프로젝트의 매니페스트와 검사 명령을 읽고 리뷰어가 재현할 명령을 적으세요.', 'Read the practice manifest/check command and write the exact command a reviewer would run.'),
    independent: b('상품 가격 변경 PR의 설명에 트리거, 전후 결과, 테스트, 미검증 경계를 네 문장으로 작성하세요.', 'Write four sentences for a product-price PR: trigger, before/after behavior, test and unverified boundary.'),
    hint: b('CI 성공과 운영 정상은 서로 다른 증거입니다.', 'CI success and production health are different evidence.'),
    solution: b('가격 1200→1300에서 수량 2 합계 2400→2600을 명시하고 단위/HTTP 테스트 결과와 DB·배포 미검증을 구분합니다.', 'For price 1200→1300, state quantity-2 total 2400→2600, plus unit/HTTP checks and the unverified DB/deploy boundary.'),
    criteria: b('다른 사람이 한 명령으로 검사하고 결과의 범위를 이해할 수 있습니다.', 'Another person can run the check and understand what the result does and does not cover.'),
    tradeoffs: b('빠른 CI는 작은 계약 검사를 먼저 수행하고 무거운 통합 검사는 필요한 서비스 준비와 격리를 명시합니다.', 'Fast CI starts with small contract checks; heavier integration checks specify service setup and isolation.'),
  },
  observability: {
    prerequisite: b('10단계의 실행 프로세스와 8단계의 재현 절차.', 'Stage 10 runtime process and stage 8 reproduction steps.'),
    glossary: b('로그는 사건 기록, metric은 수치 시계열, trace는 요청 경로, correlation ID는 기록을 연결하는 식별자, RCA는 증거로 원인을 좁히는 과정입니다.', 'A log records an event; a metric is a numeric series; a trace follows a request; a correlation ID joins records; RCA narrows causes using evidence.'),
    intro: b('201 한 건으로 전체 서비스 상태를 알 수 없습니다. 요청 수·오류·지연의 범위와, 주문 접수와 후속 처리의 시점을 구분하세요. 이 연습 서버에는 실제 metric/trace 저장소가 없습니다.', 'One 201 cannot show overall service health. Separate request counts/errors/latency from order acceptance and later work. The starter has no metrics or trace backend.'),
    flow: b('요청 ID → 경계별 안전한 로그 → 낮은 cardinality 수치 → 필요하면 trace → 같은 시간 범위의 비교. 비밀/토큰은 로그에 넣지 않습니다.', 'Request ID → safe boundary logs → low-cardinality metrics → trace if enabled → comparison in the same time window. Never log secrets or tokens.'),
    failure: b('그래프가 비면 수집 대상, 수집기, 시간 범위와 쿼리를 확인합니다. 빈 값은 0이 아닙니다. 추측한 RCA를 확정 원인으로 쓰지 않습니다.', 'For an empty graph, inspect target, collector, time range and query. Missing is not zero. Do not present a guessed RCA as confirmed.'),
    guided: b('상품 조회·주문 접수·후속 처리에 각각 어떤 지표와 ID가 필요한지 표로 만드세요.', 'Map the metric and ID needed at product read, order acceptance and later fulfillment.'),
    independent: b('HTTP p95 상승, 오류율 안정, worker 지연 증가일 때 원인을 단정하기 전에 필요한 추가 증거 세 개를 적으세요.', 'If HTTP p95 rises, errors are flat and worker delay grows, list three further observations before claiming a cause.'),
    hint: b('공유 지표와 한 주문의 증거를 섞지 않습니다.', 'Do not conflate shared metrics with one order’s evidence.'),
    solution: b('같은 시간 범위의 API 경로별 p95, DB/캐시 시간, worker lag와 주문 ID별 로그를 대조합니다. 공통 시점만으로 인과관계는 증명되지 않습니다.', 'Compare route-specific API p95, DB/cache time, worker lag and order-ID logs over the same window. Timing correlation alone does not prove causation.'),
    criteria: b('로그·metric·trace가 답하는 질문을 구분하고 자료가 없는 부분을 명시합니다.', 'Distinguish the questions logs, metrics and traces answer and state where evidence is absent.'),
    tradeoffs: b('모든 요청의 상세 trace는 비용이 큽니다. 필요한 샘플링과 개인 정보 최소화를 설계합니다.', 'Full traces for every request are expensive; design appropriate sampling and data minimization.'),
  },
  performance: {
    prerequisite: b('11단계의 지연/요청 지표와 5단계의 원본 데이터.', 'Stage 11 latency/request metrics and stage 5 source-of-truth data.'),
    glossary: b('p95는 요청의 95%가 그 이하인 지연, 캐시는 중복 계산/조회 결과를 잠시 보관, TTL은 만료 시간, 무효화는 오래된 값 제거입니다.', 'p95 is a latency threshold met by 95% of requests; a cache retains results; TTL sets expiry; invalidation removes stale values.'),
    intro: b('먼저 경로별 지연과 DB 작업을 측정하고 병목을 찾습니다. 캐시는 빠르게 보일 수 있지만 오래된 값과 추가 실패 경계를 만듭니다. 연습 서버는 Redis를 사용하지 않습니다.', 'Measure route latency and DB work before changing design. A cache can help but introduces stale values and failure boundaries. The starter does not use Redis.'),
    flow: b('키 만들기 → 적중 반환 또는 원본 조회 → TTL로 저장 → 응답. 쓰기가 생기면 무효화·버전 정책을 정합니다.', 'Build key → return hit or read source → store with TTL → respond. If data becomes writable, define invalidation/versioning.'),
    failure: b('적중률이 낮으면 키 분포·만료·요청 구성을 확인합니다. 높은 적중률인데 p95가 느리면 캐시 네트워크·직렬화·다른 경로를 봅니다.', 'For low hit rate inspect key distribution, expiry and request mix. For high hit rate but slow p95 inspect cache network, serialization and other paths.'),
    guided: b('상품 1 조회가 10회 반복되는 경우 캐시 없을 때와 TTL 캐시 있을 때 원본 조회 수를 가정해 계산하세요.', 'For ten product-1 reads, estimate source reads without a cache and with a TTL cache under stated assumptions.'),
    independent: b('가격 수정 기능이 추가되면 캐시 키, TTL, 무효화와 장애 시 fallback을 설계하고 측정 지표를 고르세요.', 'If price edits are added, design key, TTL, invalidation and failure fallback; choose measurements.'),
    hint: b('변경 가능한 값은 TTL 동안 오래될 수 있습니다.', 'Mutable values can stay stale until TTL expires.'),
    solution: b('쓰기 성공 후 해당 상품 키를 지우거나 버전을 바꾸고, DB를 진실 원본으로 유지합니다. 캐시 장애 시 DB 부하 한도를 함께 설계합니다.', 'Evict or version the affected key after a successful write; keep the DB authoritative. Bound DB load during cache failure.'),
    criteria: b('측정 전후의 범위와 캐시 최신성·장애 정책을 설명합니다.', 'Explain the before/after measurement scope, freshness and failure policy.'),
    tradeoffs: b('작은 서비스는 DB 인덱스만으로 충분할 수 있습니다. Redis는 운영과 일관성 비용을 추가합니다.', 'A DB index may suffice for a small service. Redis adds operational and consistency costs.'),
  },
  concurrency: {
    prerequisite: b('6단계의 트랜잭션과 주문 키, 8단계의 불변식 테스트.', 'Stage 6 transactions/order keys and stage 8 invariant tests.'),
    glossary: b('경합은 둘 이상이 같은 상태를 변경, 멱등성은 같은 요청 반복의 효과를 한 번으로 제한, 원자적 claim은 단일 승자를 정하는 저장소 연산입니다.', 'A race occurs when multiple actors change shared state; idempotency limits repeat effects; an atomic claim elects one winner in storage.'),
    intro: b('네트워크 재시도로 같은 주문 요청이 다시 올 수 있습니다. 연습 서버의 키 보관은 한 프로세스 안에서만 유효하며 재시작·복제 서버에는 효력이 없습니다.', 'Network retries can repeat an order. The starter’s key map works only within one process and disappears on restart or across replicas.'),
    flow: b('요청 키+정규화한 입력 → 기존 키 조회/원자적 생성 → 같은 내용은 기존 결과, 다른 내용은 409 → 한 주문 효과.', 'Key plus normalized payload → lookup/atomic create → same payload returns prior result; different payload gives 409 → one order effect.'),
    failure: b('조회와 쓰기가 서로 다른 lock/트랜잭션이면 동시 요청 둘 다 통과할 수 있습니다. DB에서는 unique 제약과 충돌 후 조회가 필요합니다.', 'If lookup and write use different locks/transactions, both requests can pass. A DB needs a unique constraint and conflict-read path.'),
    guided: b('연습 서버에서 같은 키·같은 본문 두 번, 같은 키·다른 본문 한 번의 상태를 기록하세요.', 'Record outcomes for same key/body twice and same key/different body once in the starter.'),
    independent: b('서버 두 대와 재시작 후에도 한 번만 접수하려면 어떤 DB 제약과 응답 보관이 필요한지 설계하세요.', 'Design DB constraint and saved response needed for one accepted effect across two replicas and restarts.'),
    hint: b('메모리 맵은 프로세스가 바뀌면 공유되지 않습니다.', 'An in-memory map is not shared across processes.'),
    solution: b('키에 unique 제약, 입력 fingerprint, 주문/응답을 같은 트랜잭션에 저장합니다. 충돌하면 기존 fingerprint를 비교해 재생 200 또는 409를 돌립니다.', 'Store a unique key, payload fingerprint and order/response in one transaction. On conflict, compare the fingerprint for replay 200 or 409.'),
    criteria: b('한 프로세스 시험과 다중 인스턴스 보장의 차이를 설명하고 저장소 수준 불변식을 제시합니다.', 'Explain the difference between a one-process test and multi-instance guarantee, with a storage-level invariant.'),
    tradeoffs: b('무조건 락을 크게 잡으면 처리량이 떨어집니다. DB unique 제약은 재시작에도 남지만 결과 재생 정책이 필요합니다.', 'A coarse lock limits throughput. A DB unique constraint survives restarts but still needs replay semantics.'),
  },
  messaging: {
    prerequisite: b('6단계의 outbox, 11단계의 지연 지표, 13단계의 중복 처리.', 'Stage 6 outbox, stage 11 latency signals and stage 13 duplicate handling.'),
    glossary: b('브로커는 메시지를 보관/전달, consumer는 읽는 작업자, offset은 읽은 위치, DLQ는 반복 실패 격리, 비동기는 접수와 완료를 분리합니다.', 'A broker stores/delivers messages; a consumer processes them; an offset tracks position; a DLQ isolates repeated failures; async separates acceptance from completion.'),
    intro: b('HTTP 201은 주문 접수일 뿐 후속 완료가 아닙니다. outbox relay와 worker를 거쳐 상태가 바뀝니다. 연습 서버에는 Kafka나 worker가 없고 status는 accepted로만 남습니다.', 'HTTP 201 means accepted, not fulfilled. An outbox relay and worker can later change status. The starter has neither Kafka nor worker; status remains accepted.'),
    flow: b('order+outbox commit → relay 발행 → broker → worker DB 처리 ID 기록+효과 commit → offset 확인. 중복 전달을 예상합니다.', 'Commit order+outbox → relay publish → broker → worker commits processed ID and effect → offset ack. Expect redelivery.'),
    failure: b('201 뒤 처리가 멈추면 outbox pending, 발행 여부, consumer lag, 재시도/DLQ 순서로 확인합니다. offset만으로 업무 완료를 증명하지 않습니다.', 'If work stops after 201, inspect pending outbox, publication, lag, then retry/DLQ. Offset alone does not prove business completion.'),
    guided: b('relay 발행 전과 worker commit 뒤 offset 확인 전의 두 크래시 지점을 표시하세요.', 'Mark crashes before relay publication and after worker commit but before offset acknowledgement.'),
    independent: b('이벤트가 두 번 전달될 때 재고 감소가 한 번만 일어나는 DB 제약과 테스트를 설계하세요.', 'Design a DB constraint and test ensuring stock decreases once when an event is delivered twice.'),
    hint: b('이벤트 ID를 효과와 같은 트랜잭션에 기록합니다.', 'Record processed event ID in the same transaction as the effect.'),
    solution: b('processed_event의 event_id unique 제약을 쓰고 효과와 함께 commit합니다. 두 번째 전달은 이미 처리된 ID를 확인해 효과 없이 확인합니다.', 'Use a unique processed_event event_id and commit it with the effect. On redelivery, detect the ID and acknowledge without repeating the effect.'),
    criteria: b('접수/완료 상태와 두 크래시 경계를 구분하며 실제 broker 실행 여부를 명시합니다.', 'Distinguish accepted/fulfilled and both crash boundaries; state whether a real broker was used.'),
    tradeoffs: b('동기 처리나 DB 작업표가 단순할 수 있습니다. Kafka는 운영·순서·스키마·중복 처리 비용이 있습니다.', 'Synchronous work or a DB job table may be simpler. Kafka adds operations, ordering, schema and deduplication costs.'),
  },
  capstone: {
    prerequisite: b('1–14단계의 실제 기록. 읽기 표시만으로 수행을 주장하지 않습니다.', 'Actual work from stages 1–14. Read marks alone do not establish independent performance.'),
    glossary: b('계약은 API 약속, 불변식은 반드시 유지할 데이터 규칙, 런북은 장애 대응 절차, 증거는 명령·출력·테스트·측정의 재현 가능한 기록입니다.', 'A contract is an API promise; an invariant is a data rule; a runbook is a response procedure; evidence is a reproducible record of commands, outputs, tests and measurements.'),
    intro: b('새 상품·주문 서비스를 독립적으로 만들어 설명합니다. 연습 서버는 시작점일 뿐이며 DB, 인증, 테스트, 관측, 멱등성과 후속 처리를 별도로 구현·검증해야 합니다.', 'Build and explain a new catalog/order service independently. The starter is only a beginning: DB, auth, tests, observability, idempotency and later processing need separate implementation and verification.'),
    flow: b('요구·실패 계약 → 설계 → 작은 구현 → 단위/HTTP/DB 검사 → 장애 재현 → 측정 → 리뷰 가능한 문서.', 'Requirements/failure contract → design → small implementation → unit/HTTP/DB checks → fault reproduction → measurement → reviewable documentation.'),
    failure: b('단위 테스트만 통과했다면 DB rollback과 권한을 다시 확인합니다. 데모 영상만 있으면 재현 명령과 실패 출력을 추가하세요.', 'If only unit tests pass, revisit DB rollback and authorization. If you only have a demo video, add reproducible commands and failure output.'),
    guided: b('연습 서버의 기능/누락 경계를 목록으로 만들고 DB·인증·관측 중 첫 확장을 선택해 수용 기준을 작성하세요.', 'Inventory the starter’s features/gaps and write acceptance criteria for the first extension among DB, auth and observability.'),
    independent: b('새 저장소에서 주문 접수→비동기 완료를 구현하거나 설계 대체안을 선택하고, 정상·중복·권한 거부·DB 실패·worker 실패의 결과를 증거와 함께 제출하세요.', 'In a new repository implement accepted→asynchronous fulfillment or justify an alternative; submit evidence for success, duplicate, access denial, DB failure and worker failure.'),
    hint: b('기능 목록보다 실패 시 데이터가 어떻게 남는지를 먼저 정의합니다.', 'Define persisted state after failure before listing features.'),
    solution: b('한 정답은 없습니다. 리뷰어가 실행 가능해야 하며 201과 완료를 구분하고 DB/중복/권한 불변식, 실패 재현, 운영 한계를 확인할 수 있어야 합니다.', 'There is no single solution. A reviewer must be able to run it and verify accepted vs fulfilled, DB/duplicate/access invariants, failures and operational limits.'),
    criteria: b('독립 실행 명령, 실제 테스트 결과, DB와 권한 실패 증거, 측정 범위, 남은 위험을 제출합니다.', 'Submit independent run commands, actual tests, DB/access failure evidence, measurement scope and remaining risks.'),
    tradeoffs: b('처음부터 Kafka/Redis가 필요한 것은 아닙니다. 요구량과 실패 복구 정책으로 기술 선택을 설명합니다.', 'Kafka/Redis are not automatic requirements; justify choices through load and recovery requirements.'),
  },
};

type ExtraId = keyof typeof extra;
const extraSource: Record<Exclude<ExtraId, 'tools'|'basics'>, string> = {
  http: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
  transactions: 'https://www.sqlite.org/lang_transaction.html',
  collaboration: 'https://docs.github.com/en/actions',
  observability: 'https://opentelemetry.io/docs/concepts/observability-primer/',
  performance: 'https://redis.io/docs/latest/develop/use/',
  concurrency: 'https://www.sqlite.org/lang_transaction.html',
  messaging: 'https://kafka.apache.org/documentation/',
  capstone: 'https://12factor.net/',
};
const languageSource: Record<Track, string> = {
  python: 'https://docs.python.org/3/tutorial/',
  javascript: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
  csharp: 'https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/',
};
const path = 'examples/language-paths/';
const languageFile: Record<Track, string> = { python: 'python/app.py', javascript: 'javascript/app.mjs', csharp: 'csharp/Program.cs' };
const runCommand: Record<Track, string> = { python: 'python3 app.py', javascript: 'node app.mjs', csharp: 'dotnet run' };
const testCommand: Record<Track, string> = { python: 'python3 -m unittest -v', javascript: 'node --test', csharp: 'curl -i http://127.0.0.1:18182/products/1' };
const advancedRoot = path + 'advanced/';
const advancedFiles: Record<Track, { api: string; store: string; worker: string; tests: string }> = {
  python: { api: 'api.py', store: 'store.py', worker: 'worker.py', tests: 'test_store.py' },
  javascript: { api: 'api.mjs', store: 'store.mjs', worker: 'worker.mjs', tests: 'store.test.mjs' },
  csharp: { api: 'Program.cs', store: 'Store.cs', worker: 'Program.cs', tests: 'tests/StoreTests.cs' },
};
function advancedProjectFile(language: Track, stage: LanguageStage): string {
  const part = ['persistence', 'transactions', 'performance', 'concurrency'].includes(stage) ? 'store'
    : ['testing', 'collaboration'].includes(stage) ? 'tests'
    : stage === 'messaging' ? 'worker' : 'api';
  return advancedRoot + language + '/' + advancedFiles[language][part as 'api'|'store'|'worker'|'tests'];
}
const advancedRun: Record<Track, string> = {
  python: 'python3 -m uvicorn entry:app --host 127.0.0.1 --port 18183',
  javascript: 'node api.mjs', csharp: 'dotnet run -- serve',
};
const workerRun: Record<Track, string> = {
  python: 'python3 worker.py', javascript: 'node worker.mjs', csharp: 'dotnet run -- worker',
};
const advancedTest: Record<Track, string> = {
  python: 'python3 -m unittest -v', javascript: 'node --test',
  csharp: 'dotnet test tests/CatalogAdvanced.Tests.csproj',
};
const startCode: Record<Track, Record<'tools'|'basics'|'http', string>> = {
  python: { tools: 'python3 --version\ncd examples/language-paths/python\npython3 -m unittest -v', basics: 'def total(quantity):\n    if not 1 <= quantity <= 100:\n        raise ValueError("quantity")\n    return 1200 * quantity\nprint(total(2))  # 2400', http: 'python3 app.py\ncurl -i http://127.0.0.1:18182/products/1\ncurl -i http://127.0.0.1:18182/products/9' },
  javascript: { tools: 'node --version\ncd examples/language-paths/javascript\nnode --test', basics: 'function total(quantity) {\n  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new RangeError("quantity");\n  return 1200 * quantity;\n}\nconsole.log(total(2)); // 2400', http: 'node app.mjs\ncurl -i http://127.0.0.1:18182/products/1\ncurl -i http://127.0.0.1:18182/products/9' },
  csharp: { tools: 'dotnet --version\ncd examples/language-paths/csharp\ndotnet run', basics: 'static int Total(int quantity) {\n    if (quantity is < 1 or > 100) throw new ArgumentOutOfRangeException(nameof(quantity));\n    return 1200 * quantity;\n}', http: 'dotnet run\ncurl -i http://127.0.0.1:18182/products/1\ncurl -i http://127.0.0.1:18182/products/9' },
};

const advancedCode: Record<Track, Record<Exclude<ExtraId, 'tools'|'basics'|'http'>, string>> = {
  python: {
    transactions: 'db.execute("BEGIN IMMEDIATE")\ntry:\n    db.execute("INSERT INTO orders (...) VALUES (...) ", values)\n    db.execute("INSERT INTO outbox(event_id,order_id) VALUES(?,?)", (event_id, order_id))\n    db.execute("COMMIT")\nexcept BaseException:\n    db.execute("ROLLBACK")\n    raise\n# values/schema are shown in advanced/python/store.py',
    collaboration: 'python3 -m unittest -v\ngit diff --check\n# CI must provision the same Python version and working directory',
    observability: 'start = time.perf_counter()\ntry:\n    return handle_order(request_id)\nfinally:\n    elapsed_ms = (time.perf_counter() - start) * 1000\n    logger.info("order_request_done", extra={"request_id": request_id, "elapsed_ms": elapsed_ms})',
    performance: 'cache = {}\n# key -> (expires_at, value); compare time.monotonic() before returning\n# source DB remains authoritative; no Redis call in this model',
    concurrency: 'with store.lock:\n    if key in store.keys: return previous_result(key)\n    return create_and_record(key, payload)\n# one-process model; DB unique key needed across replicas',
    messaging: 'db.execute("BEGIN IMMEDIATE")\n# insert order and outbox with this connection, then COMMIT\n# separate worker.py reads pending rows and commits processed_event + status\n# no Kafka broker in this local exercise',
    capstone: 'python3 -m unittest -v\n# add isolated DB rollback, 401/403, duplicate and worker-failure tests',
  },
  javascript: {
    transactions: "db.exec('BEGIN IMMEDIATE');\ntry {\n  db.prepare('INSERT INTO orders(...) VALUES(...)').run(/* bound values */);\n  db.prepare('INSERT INTO outbox(event_id,order_id) VALUES(?,?)').run(eventId, orderId);\n  db.exec('COMMIT');\n} catch (error) { db.exec('ROLLBACK'); throw error; }\n// complete bound values in advanced/javascript/store.mjs",
    collaboration: 'node --test\ngit diff --check\n# CI must use the same Node major version; TypeScript needs its own type check',
    observability: "const start = performance.now();\nres.on('finish', () => {\n  metrics.requests++;\n  metrics.errors += Number(res.statusCode >= 400);\n  console.log(JSON.stringify({ requestId, path: req.path, status: res.statusCode, elapsedMs: performance.now() - start }));\n});",
    performance: 'const cache = new Map();\n// key -> { expiresAt, value }; check performance.now() before returning\n// process-local model only; no Redis here',
    concurrency: "const previous = keys.get(key);\nif (previous) return replayOrConflict(previous, payload);\nkeys.set(key, claim(payload));\n// this only serializes synchronous work in one Node process",
    messaging: "db.exec('BEGIN IMMEDIATE');\n// store.create inserts order + outbox, then COMMIT\n// worker.mjs separately polls pending rows and commits processed_event + status\n// no Kafka broker in this local exercise",
    capstone: 'node --test\n# add DB rollback, auth, duplicate-across-replicas and worker-failure tests',
  },
  csharp: {
    transactions: 'using var tx = db.BeginTransaction();\nusing var orderInsert = db.CreateCommand();\norderInsert.Transaction = tx;\n// add parameters and insert order; then outbox using the same tx\ntx.Commit();\n// full commands and rollback test: advanced/csharp/Store.cs',
    collaboration: 'dotnet test\ngit diff --check\n// create a test project first; starter has no test framework dependency',
    observability: 'var started = Stopwatch.GetTimestamp();\ntry { await next(context); }\nfinally {\n    Interlocked.Increment(ref requests);\n    Console.WriteLine(JsonSerializer.Serialize(new { status = context.Response.StatusCode, elapsedMs = Stopwatch.GetElapsedTime(started).TotalMilliseconds }));\n}',
    performance: 'var cache = new ProductCache(TimeSpan.FromSeconds(30));\nvar product = cache.GetOrLoad(id, () => store.Product(id));\n// a local TTL model; this is not distributed Redis',
    concurrency: 'lock (gate) {\n    if (keys.TryGetValue(key, out var old)) return ReplayOrConflict(old, input);\n    // create order and key together in this one process\n}',
    messaging: 'using var tx = db.BeginTransaction();\n// Store.Create inserts order + outbox with tx and commits\n// separate Store.ProcessOne commits processed_event + fulfilled status\n// no Kafka broker in this local exercise',
    capstone: 'dotnet test\n// add a test project and real DB/auth/duplicate/worker-failure checks',
  },
};

const reused: Record<Extract<LanguageStage, 'api'|'persistence'|'security'|'testing'|'operations'>, PhaseId> = {
  api: 'api', persistence: 'db', security: 'auth', testing: 'tests', operations: 'deployment',
};
const baseExpansion: Record<keyof typeof reused, Pick<Detail, 'prerequisite'|'glossary'|'hint'|'solution'|'criteria'|'tradeoffs'>> = {
  api: { prerequisite: b('3단계의 메서드·경로·상태 코드.', 'Stage 3 methods, paths and status codes.'), glossary: b('라우트는 경로 처리기, 검증은 입력 계약 확인, 서비스는 업무 규칙을 둔 경계입니다.', 'A route handles a path, validation checks an input contract, and a service owns business rules.'), hint: b('입력 오류와 없는 자원을 분리하세요.', 'Separate invalid input from missing resources.'), solution: b('GET /products/1은 200, 없는 정수 ID는 404입니다. 타입 오류는 400/422 중 프레임워크 계약에 맞게 정합니다.', 'GET /products/1 returns 200, a missing integer ID 404; define 400/422 for malformed input according to framework contract.'), criteria: b('200/400/404와 요청·서비스·응답 경계를 보여 줍니다.', 'Show 200/400/404 and request/service/response boundaries.'), tradeoffs: b('프레임워크는 반복 코드를 줄이지만 경계 검증 자체를 대신하지 않습니다.', 'A framework reduces boilerplate but does not replace boundary validation.') },
  persistence: { prerequisite: b('4단계의 API와 주문 데이터.', 'Stage 4 API and order data.'), glossary: b('행·열은 관계형 데이터 단위, 기본키는 행 식별자, 쿼리는 DB 요청, 마이그레이션은 schema 변경 기록입니다.', 'Rows/columns hold relational data, a primary key identifies a row, a query requests data, and a migration records schema changes.'), hint: b('메모리 저장과 DB 저장의 재시작 동작을 비교하세요.', 'Compare restart behavior of memory and database storage.'), solution: b('메모리 주문은 재시작 뒤 없어집니다. DB에는 기본키·제약·스키마를 만들고 매개변수 쿼리로 저장·조회해야 합니다.', 'In-memory orders vanish after restart. A DB needs key/constraints/schema and parameterized writes/reads.'), criteria: b('상품 없음과 DB 연결 실패를 구별하고 재시작 후 데이터 보존을 확인합니다.', 'Distinguish missing product from DB connection failure and verify durability across restart.'), tradeoffs: b('DB는 내구성을 주지만 연결·마이그레이션·운영 비용이 있습니다.', 'A DB provides durability with connection, migration and operational costs.') },
  security: { prerequisite: b('5단계의 주문 소유자 데이터와 HTTP 상태.', 'Stage 5 owner data and HTTP statuses.'), glossary: b('인증은 신원 확인, 인가는 접근 허가, 401은 인증 실패, 403은 인증됐지만 권한 없음입니다.', 'Authentication establishes identity; authorization permits access; 401 is unauthenticated, 403 forbidden.'), hint: b('소유자 검사를 주문 조회 경로에도 적용하세요.', 'Apply ownership checks to order reads too.'), solution: b('검증된 신원과 order.owner_id를 비교하고 누락/무효 토큰에는 401, 타인 주문에는 403 또는 정보 노출을 줄이는 404 정책을 일관되게 씁니다.', 'Compare verified identity with order.owner_id; use 401 for missing/invalid token and a consistent 403 or privacy-preserving 404 policy for another user’s order.'), criteria: b('토큰 검증과 주문 소유권 검사를 분리하고 실패 테스트를 설계합니다.', 'Separate token verification from order ownership and design failure tests.'), tradeoffs: b('연습 서버에는 인증이 없으므로 공개 네트워크에 바인딩하거나 실사용 주문을 넣지 않습니다.', 'The starter has no auth; do not bind publicly or use real orders.') },
  testing: { prerequisite: b('앞 단계들의 정상·실패 계약.', 'Success/failure contracts from earlier stages.'), glossary: b('단위 테스트는 작은 규칙, HTTP 계약 검사는 요청/응답, 통합 테스트는 실제 연결 경계를 확인합니다.', 'A unit test checks a small rule, an HTTP contract test checks requests/responses, and an integration test crosses real dependencies.'), hint: b('상태뿐 아니라 주문 행/메모리 상태 불변식을 확인하세요.', 'Check state invariants as well as HTTP status.'), solution: b('첫 주문 201, 동일 키 재생 200, 다른 입력 409, 주문 수 1을 검증합니다. DB rollback은 별도 격리 DB가 필요합니다.', 'Assert first order 201, same-key replay 200, changed payload 409, and one order. DB rollback requires a separate isolated DB.'), criteria: b('정상·중복·오류의 상태/본문/상태 불변식을 반복 가능하게 검사합니다.', 'Repeatably check status/body/state invariants for success, replay and error.'), tradeoffs: b('모형 테스트는 네트워크·DB·운영 배포를 증명하지 못합니다.', 'Model tests do not prove network, DB or production deployment.') },
  operations: { prerequisite: b('9단계의 재현 가능한 명령과 5단계의 schema 개념.', 'Stage 9 reproducible commands and stage 5 schema concepts.'), glossary: b('readiness는 트래픽 수용 준비, liveness는 프로세스 생존 신호, rollback은 이전 버전 복귀입니다.', 'Readiness signals ability to receive traffic, liveness indicates a running process, and rollback returns to a prior version.'), hint: b('앱과 DB의 schema 버전이 잠시 공존할 수 있게 합니다.', 'Allow old/new app versions to coexist with the DB schema temporarily.'), solution: b('확장 마이그레이션→신·구 앱 공존→트래픽 전환→이전 앱 제거→축소 순서로 설계하고 오류율·지연을 감시합니다.', 'Plan expand migration → old/new app coexistence → traffic switch → old app removal → contract migration, watching error rate and latency.'), criteria: b('환경/비밀/포트/health/롤백과 실제 실행하지 않은 부분을 분리합니다.', 'Account for environment, secrets, port, health and rollback, and distinguish unrun parts.'), tradeoffs: b('로컬 loopback 서버는 배포 증거가 아닙니다. 프록시·TLS·관측·보안은 별도입니다.', 'A loopback starter is not deployment evidence; proxy, TLS, observability and security are separate.') },
};

export type DepthChapter = Chapter & Pick<Detail, 'prerequisite'|'glossary'|'hint'|'solution'|'criteria'|'tradeoffs'> & { expected: Copy; projectFile: string; run: string };
export function depthChapter(language: Track, id: LanguageStage): DepthChapter {
  const starter = id === 'tools' || id === 'basics' || id === 'http';
  const projectFile = starter ? path + languageFile[language] : advancedProjectFile(language, id);
  const run = starter ? (id === 'tools' ? testCommand[language] : runCommand[language])
    : id === 'testing' || id === 'collaboration' ? advancedTest[language]
    : id === 'messaging' ? `${advancedRun[language]}\n# separate terminal, same isolated PRACTICE_DB\n${workerRun[language]}` : advancedRun[language];
  if (id in reused) {
    const key = id as keyof typeof reused;
    const chapter = courseChapters[language][reused[key]];
    return { ...chapter, ...baseExpansion[key], codeScope: b(`${chapter.codeScope.ko} 같은 주제의 완전한 로컬 SQLite 예제는 아래 고급 실습 파일에 있습니다. 실행 기록은 저장소 검증 문서를 확인하세요.`, `${chapter.codeScope.en} A complete local SQLite practice implementation of the same boundary is in the advanced project file below. See repository validation records for actual executions.`), expected: b('실제 출력은 환경과 입력에 따라 다릅니다. 예시만 읽었다면 미실행으로 기록하세요.', 'Actual output depends on environment/input. If you only read the snippet, record it as unrun.'), projectFile, run };
  }
  const key = id as ExtraId;
  const detail = extra[key];
  const code = key === 'tools' || key === 'basics' || key === 'http' ? startCode[language][key] : advancedCode[language][key];
  const isRunnable = key === 'tools' || key === 'http';
  const scope = isRunnable
    ? b('연습 프로젝트와 명령이 제공됩니다. 실행 환경이 있는 경우에만 직접 실행해 결과를 기록하세요. 이 화면은 실행하지 않습니다.', 'The practice project and commands are supplied. Run only if the runtime is present and record your own result; this page executes nothing.')
    : b('이 조각은 개념의 한 경계를 보여 줍니다. 별도 고급 프로젝트에 SQLite 주문·outbox·소유권 검사·로컬 계측·worker의 전체 코드가 있습니다. Redis/Kafka/외부 관측은 구현하지 않았고 실제 실행 범위는 검증 기록을 확인하세요.', 'This fragment isolates one idea. The separate advanced project contains complete local SQLite order/outbox, owner checks, process metrics and worker code. Redis, Kafka and external observability are not implemented, and actual execution scope is recorded in the validation document.');
  return {
    intro: detail.intro, flow: detail.flow, code, codeScope: scope, failure: detail.failure,
    guided: detail.guided, independent: detail.independent,
    source: key === 'tools' || key === 'basics' ? languageSource[language] : extraSource[key],
    prerequisite: detail.prerequisite, glossary: detail.glossary, hint: detail.hint,
    solution: detail.solution, criteria: detail.criteria, tradeoffs: detail.tradeoffs,
    expected: key === 'basics' ? b('수량 2의 예상 합계: 2400. 0은 오류입니다.', 'Expected total for quantity 2: 2400; zero is an error.') : b('실제 출력은 실행 환경에 따라 다릅니다. 설명용 코드와 직접 실행 기록을 구분하세요.', 'Actual output varies by environment. Separate illustrative code from your own run record.'),
    projectFile, run,
  };
}
