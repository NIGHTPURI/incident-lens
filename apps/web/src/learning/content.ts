import type { Scenario } from "../types";
import type { Locale } from "../i18n/translations";

export type Text = Record<Locale, string>;
export const both = (ko: string, en: string): Text => ({ ko, en });
export type Topic = {
  name: Text;
  sections: [Text, Text, Text, Text, Text, Text, Text];
  code: string;
};
export type Lesson = {
  id: string;
  title: Text;
  goal: Text;
  situation: Text;
  question: Text;
  answer: Text;
  hint: Text;
  topics: Topic[];
  scenario?: Scenario;
};
const topic = (name: Text, sections: Topic["sections"], code: string): Topic => ({ name, sections, code });

export const lessons: Lesson[] = [
  {
    id: "request", title: both("01 · 요청과 응답", "01 · Request and response"),
    goal: both("요청이 어디서 검증되고 무엇이 응답 완료를 뜻하는지 설명한다.", "Explain where a request is validated and what a completed response means."),
    situation: both("상품 목록을 열거나 주문 버튼을 눌렀습니다. 화면이 응답을 받는 동안 서버에서는 무슨 일이 일어날까요?", "You open a product list or submit an order. What happens on the server before the screen receives a response?"),
    question: both("주문 API가 성공을 반환했다면 worker의 후속 처리도 끝났을까요?", "If the order API returns success, has the worker finished its follow-up work?"),
    answer: both("아니요. 주문과 outbox 저장이 성공한 뒤 HTTP가 끝납니다. Kafka 발행과 worker 처리는 그 이후일 수 있습니다.", "No. HTTP completes after the order and outbox are stored. Kafka publication and worker processing may happen later."),
    hint: both("HTTP 응답 경계와 비동기 작업의 완료 경계를 나눠 보세요.", "Separate the HTTP response boundary from completion of asynchronous work."),
    topics: [
      topic(both("HTTP / API", "HTTP / API"), [
        both("요청과 응답의 계약이 없으면 화면은 무엇을 보냈고 무엇을 받았는지 알 수 없습니다.", "Without a request/response contract, the screen cannot tell what it sent or received."),
        both("식당 주문표처럼 URL과 메서드는 창구, 본문은 주문 내용, 상태 코드는 접수 결과입니다.", "Think of a restaurant ticket: URL and method choose the counter, body gives the order, status reports acceptance."),
        both("GET /api/catalog는 상품을 읽고 POST /api/orders는 Idempotency-Key와 상품·수량을 받습니다.", "GET /api/catalog reads products; POST /api/orders accepts an Idempotency-Key, product and quantity."),
        both("브라우저와 서버 사이의 명확한 경계를 만들고 잘못된 입력을 일찍 거절합니다.", "It creates a clear browser/server boundary and rejects invalid input early."),
        both("HTTP만으로 후속 작업 완료를 보장하지 않습니다. 단순한 동기 작업이라면 큐 없이 한 요청에서 끝내도 됩니다.", "HTTP does not guarantee follow-up completion. A simple synchronous task may need no queue."),
        both("상태 코드 오류, 시간 초과, p95 상승을 먼저 보고 어느 경계가 느린지 확인합니다.", "Start with status errors, timeouts and p95, then find the slow boundary."),
        both("OrderController의 응답 헤더와 OrderService의 검증을 확인하세요.", "Inspect the response header in OrderController and validation in OrderService."),
      ], "apps/demo-api/src/main/java/io/incidentlens/demoapi/OrderController.java"),
      topic(both("Spring Boot", "Spring Boot"), [
        both("요청 연결, 검증, 서비스 호출, 오류 응답을 매번 직접 엮으면 실수가 늘어납니다.", "Hand-wiring routing, validation, services and errors for every request invites mistakes."),
        both("접수 담당자가 주문표를 검사하고 담당 주방에 넘기는 역할입니다.", "It acts like a clerk who checks a ticket and routes it to the right kitchen."),
        both("Controller가 경로를 받고 Service가 비즈니스 작업을 수행합니다. 검증 실패는 성공 응답이 아닙니다.", "Controllers receive routes; services perform business work. Validation failure is not a success response."),
        both("이 프로젝트의 Java API와 트랜잭션·관측 기능을 한 실행 단위로 묶기 좋습니다.", "It packages this Java API with transaction and observation support."),
        both("작은 정적 서비스에는 무거울 수 있습니다. 필요한 기능이 적다면 더 단순한 HTTP 서버도 가능합니다.", "It may be heavy for a tiny static service; a smaller HTTP server can suffice."),
        both("요청 오류와 내부 예외를 구분하고 서비스 상태 및 로그를 함께 확인합니다.", "Distinguish request errors from internal exceptions; check service health and logs."),
        both("CatalogController와 OrderController의 경로 선언을 비교하세요.", "Compare route declarations in CatalogController and OrderController."),
      ], "apps/demo-api/src/main/java/io/incidentlens/demoapi/CatalogController.java"),
    ],
  },
  {
    id: "database", title: both("02 · DB와 트랜잭션", "02 · Database and transactions"),
    goal: both("지속 저장과 함께 성공해야 하는 작업의 범위를 설명한다.", "Explain durable storage and the boundary of work that must succeed together."),
    situation: both("주문은 저장됐는데 발행할 이벤트 기록이 없다면 이후 처리는 시작할 수 없습니다.", "If an order is saved without an event record, follow-up processing cannot begin."),
    question: both("주문 행만 먼저 저장하고 나중에 outbox 행을 저장하면 안전할까요?", "Is it safe to save the order row first and its outbox row later?"),
    answer: both("사이에서 프로세스가 종료되면 이벤트 의도가 사라집니다. 두 행을 같은 MySQL 트랜잭션에 저장합니다.", "A crash between writes loses the intent to publish. Save both rows in one MySQL transaction."),
    hint: both("두 쓰기 중 하나만 성공했을 때를 상상해 보세요.", "Imagine only one of the two writes succeeds."),
    scenario: "DATABASE_DEGRADATION",
    topics: [topic(both("MySQL와 트랜잭션", "MySQL and transactions"), [
      both("메모리만 쓰면 재시작 때 주문이 사라지고, 분리된 두 쓰기는 절반만 성공할 수 있습니다.", "Memory loses orders on restart, and separate writes can succeed only halfway."),
      both("장부 두 칸을 함께 확정하거나 둘 다 취소하는 것과 같습니다.", "It is like committing two ledger entries together or cancelling both."),
      both("OrderService.create의 @Transactional 안에서 주문 행과 outbox 행을 기록합니다. 중복 키는 유니크 인덱스로 조정합니다.", "OrderService.create writes order and outbox rows under @Transactional. A unique index coordinates duplicate keys."),
      both("복구 가능한 주문과 이벤트 발행 의도를 같은 DB에서 원자적으로 남기기 위해 선택했습니다.", "It atomically keeps the recoverable order and intent to publish in one database."),
      both("트랜잭션은 Kafka까지 포함하지 않습니다. 단순 조회나 독립된 작업에는 이 결합이 필요하지 않습니다.", "The transaction does not cover Kafka. Simple reads or independent work need no such coupling."),
      both("DB 조회 p95와 요청 p95를 함께 봅니다. DB 비효율 실험은 캐시도 우회하므로 두 효과를 분리해 해석합니다.", "Compare DB query p95 and request p95. The DB fault also bypasses cache, so separate those effects."),
      both("OrderService의 두 INSERT와 CatalogRepository의 정상·비효율 조회를 확인하세요.", "Inspect both INSERTs in OrderService and normal/degraded reads in CatalogRepository."),
    ], "apps/demo-api/src/main/java/io/incidentlens/demoapi/OrderService.java")],
  },
  {
    id: "cache", title: both("03 · 캐시", "03 · Cache"),
    goal: both("적중·미적중·우회가 DB 부하에 주는 영향을 구별한다.", "Distinguish cache hits, misses and bypasses by their effect on database load."),
    situation: both("같은 상품 목록을 여러 사용자가 열면 매번 DB에서 읽어야 할까요?", "When many users open the same product list, must every request read the database?"),
    question: both("캐시 적중률이 낮아졌다는 사실만으로 Redis 장애라고 판단할 수 있을까요?", "Does a low hit rate alone prove Redis failed?"),
    answer: both("아니요. 초기 미적중, 우회 설정, 키 분포도 원인입니다. DB 로드와 CACHE_BYPASS 이벤트를 함께 봅니다.", "No. Cold misses, bypass settings and key distribution also matter. Check database loads and CACHE_BYPASS events."),
    hint: both("캐시 우회와 빈 캐시에서 처음 조회하는 경우를 구분해 보세요.", "Separate a deliberate bypass from the first lookup into an empty cache."),
    scenario: "CACHE_DEGRADATION",
    topics: [topic(both("Redis 상품 목록 캐시", "Redis catalog cache"), [
      both("반복 조회를 모두 MySQL로 보내면 요청과 DB 작업이 함께 늘어납니다.", "Sending every repeated read to MySQL increases both request and database work."),
      both("자주 찾는 책의 사본을 안내 데스크에 두는 것과 같습니다.", "It is like keeping a copy of a popular book at the front desk."),
      both("카테고리 키를 먼저 읽고, 미적중이면 카테고리별 잠금 아래 DB에서 읽어 25~35초 TTL로 저장합니다.", "The API reads a category key, then on a miss loads MySQL under a per-category lock and caches for 25–35 seconds."),
      both("같은 목록의 반복 조회를 줄이기 위한 선택입니다. 장애 시에는 DB로 제한된 우회를 시도합니다.", "It reduces repeated list reads. On cache failure, a bounded database fallback is attempted."),
      both("데이터 신선도와 운영 비용이 생깁니다. 조회가 드물거나 최신 값이 필수라면 DB 직접 조회가 더 단순합니다.", "It adds staleness and operating cost. Rare reads or strict freshness may favor direct DB reads."),
      both("적중률, DB 로드, 요청 p95를 함께 봅니다. 미측정 값은 정상이나 0이 아닙니다.", "Read hit rate, DB loads and request p95 together. Missing values are neither healthy nor zero."),
      both("CatalogService.find에서 적중·미적중·우회 분기를 확인하세요.", "Inspect hit, miss and bypass branches in CatalogService.find."),
    ], "apps/demo-api/src/main/java/io/incidentlens/demoapi/CatalogService.java")],
  },
  {
    id: "async", title: both("04 · 비동기 처리", "04 · Asynchronous processing"),
    goal: both("접수와 후속 처리를 나누는 이유와 대기량의 의미를 설명한다.", "Explain why acceptance and follow-up processing are separate, and what backlog means."),
    situation: both("주문 접수는 빠르지만 후속 처리 속도가 느리면 완료 대기량이 쌓입니다.", "Orders may be accepted quickly while slower follow-up processing builds a queue."),
    question: both("HTTP 응답 p95가 그대로인데 Kafka lag가 증가하면 무엇을 의심할까요?", "If HTTP p95 stays steady while Kafka lag rises, what would you suspect?"),
    answer: both("worker 처리량이 유입량보다 적을 수 있습니다. worker 로그, 처리 시간, 재시도와 lag 변화를 확인합니다.", "The worker may process less than arrives. Check worker logs, processing time, retries and lag trend."),
    hint: both("접수 속도와 처리 속도를 따로 생각해 보세요.", "Think about acceptance rate and processing rate separately."),
    scenario: "KAFKA_SLOWDOWN",
    topics: [
      topic(both("Kafka와 worker", "Kafka and worker"), [
        both("후속 처리를 HTTP 요청 안에서 끝내면 느린 작업이 응답을 붙잡습니다.", "Completing follow-up work inside HTTP holds the response open."),
        both("접수 창구와 작업 대기표를 분리한 것과 같습니다.", "It is like separating the intake counter from a work queue."),
        both("relay가 Kafka에 주문 이벤트를 보낸 뒤 worker가 소비해 자체 DB에 처리 결과를 기록합니다.", "The relay sends order events to Kafka; the worker consumes them and records processing in its own database."),
        both("접수와 후속 처리의 속도·실패 경계를 나눠 지연과 대기량을 관찰할 수 있습니다.", "It separates speed and failure boundaries, making delay and backlog visible."),
        both("운영 구성과 중복 처리 비용이 생깁니다. 작은 동기 작업에는 큐 없이 처리하는 편이 간단합니다.", "It adds infrastructure and duplicate handling. A small synchronous task may be simpler without a queue."),
        both("lag 증가, 처리 이벤트 지연, 재시도를 함께 봅니다. lag만으로 원인을 확정하지 않습니다.", "Check rising lag, delayed processing events and retries; lag alone does not identify a cause."),
        both("OrderListener와 FulfillmentService를 확인하세요. 이 worker는 실제 결제·배송을 하지 않습니다.", "Inspect OrderListener and FulfillmentService. This worker does not perform real payment or shipping."),
      ], "apps/demo-worker/src/main/java/io/incidentlens/demoworker/OrderListener.java"),
      topic(both("Docker", "Docker"), [
        both("MySQL, Redis, Kafka와 Java 서비스의 실행 환경이 다르면 로컬 재현이 어렵습니다.", "Different runtime requirements for MySQL, Redis, Kafka and Java services make local reproduction hard."),
        both("각 부품을 같은 규격의 작업대에 올려놓는 것과 같습니다.", "It is like giving every component a repeatable workbench."),
        both("Compose가 서비스별 컨테이너, 네트워크, 상태 검사를 구성합니다. 데이터 볼륨은 내려도 보존됩니다.", "Compose sets up separate containers, networking and health checks. Named data volumes survive normal shutdown."),
        both("학습자가 같은 구성요소를 로컬에서 다시 실행할 수 있게 합니다.", "It lets learners run the same components locally."),
        both("메모리와 이미지 빌드 시간이 듭니다. DB 하나만 살펴볼 때는 단일 로컬 프로세스가 더 간단할 수 있습니다.", "It costs memory and build time. A single local process can be simpler for a narrow DB lesson."),
        both("컨테이너 상태와 readiness를 확인하고, 앱 오류를 컨테이너 시작 실패와 구분합니다.", "Check container health and readiness; distinguish app failures from startup failures."),
        both("docker-compose.yml의 서비스 의존성과 볼륨을 확인하세요.", "Inspect service dependencies and volumes in docker-compose.yml."),
      ], "docker-compose.yml"),
      topic(both("k6", "k6"), [
        both("손으로 한 번 누른 요청만으로는 여러 사용자가 겪는 지연을 재현하기 어렵습니다.", "A single manual click cannot reproduce latency under multiple users."),
        both("같은 수의 연습 손님을 정해진 시간 동안 다시 보내는 것과 같습니다.", "It is like sending the same number of practice customers for a set time."),
        both("외부 터미널 명령이 k6 컨테이너를 실행합니다. 지정한 가상 사용자 수·시간으로 상품 조회와 주문 요청을 보내고 요약 파일을 저장합니다.", "An external terminal command starts the k6 container. It sends catalog and order requests at configured virtual users and duration and saves a summary."),
        both("BEFORE와 AFTER의 부하 설정을 맞춰 차이를 질문하기 위해 사용합니다.", "It keeps workload settings comparable between BEFORE and AFTER."),
        both("같은 설정도 완료 요청 수와 데이터 상태가 다를 수 있습니다. 작은 확인에는 curl이 더 단순하며 로컬 부하는 운영 용량 예측이 아닙니다.", "Identical settings can still yield different request counts and data state. curl is simpler for a small probe; local load does not predict production capacity."),
        both("요청 수, 오류, 실제 구간 시간, 다른 트래픽을 함께 봅니다.", "Check request count, errors, actual phase duration and other traffic."),
        both("scripts/demo-compare.sh와 loadtest/workload.js의 요청·정리 절차를 확인하세요.", "Inspect requests and cleanup in scripts/demo-compare.sh and loadtest/workload.js."),
      ], "scripts/demo-compare.sh"),
    ],
  },
  {
    id: "outbox", title: both("05 · Outbox와 중복 방지", "05 · Outbox and deduplication"),
    goal: both("DB 저장과 Kafka 발행 사이의 실패 및 재전송을 설명한다.", "Explain failures between DB commit and Kafka publication, including redelivery."),
    situation: both("주문 저장 직후 프로세스가 종료되거나, Kafka가 받았는데 발행 완료 표시가 실패할 수 있습니다.", "A process may crash after saving an order, or after Kafka accepts an event but before publication is marked complete."),
    question: both("Kafka가 받았다는 응답 후 DB 표시가 실패하면 이벤트는 한 번만 전달될까요?", "If marking the row fails after Kafka acknowledgement, is delivery guaranteed to happen only once?"),
    answer: both("아니요. relay가 재발행할 수 있습니다. worker는 이벤트 ID를 기록해 같은 이벤트의 효과를 중복 적용하지 않습니다.", "No. The relay may republish. The worker records the event ID to avoid applying the same event twice."),
    hint: both("재시도 가능한 경계에서는 중복 도착을 가정하세요.", "Assume duplicates can arrive across a retry boundary."),
    topics: [topic(both("Outbox와 멱등성", "Outbox and idempotency"), [
      both("DB 커밋 뒤 직접 발행이 실패하면 이벤트가 사라집니다. 발행 먼저는 취소된 주문을 알릴 수 있습니다.", "Publish-after-commit can lose an event; publish-before-commit can announce a rolled-back order."),
      both("장부에 주문과 발송할 쪽지를 함께 적고, 배달 담당자가 쪽지를 가져갑니다.", "Record the order and a dispatch note in one ledger; a courier collects the note later."),
      both("주문·outbox가 같은 트랜잭션에 저장됩니다. relay는 배치를 claim하고 Kafka 확인 후 게시 완료로 표시합니다. worker는 event ID로 중복을 막습니다.", "Order and outbox commit together. The relay claims a batch and marks published after Kafka ack. The worker deduplicates by event ID."),
      both("주문 저장의 지속성과 나중에 발행할 의도를 함께 보존하기 위해 선택했습니다.", "It preserves both durable order data and the intent to publish."),
      both("중복 발행 가능성과 지연이 남습니다. DB와 메시징을 함께 쓸 필요가 없다면 직접 호출이 더 단순합니다.", "Duplicates and delay remain possible. If no DB/message boundary exists, direct calls are simpler."),
      both("outbox pending, 발행 실패, Kafka lag, worker 처리 기록을 따로 확인합니다. 종단 간 exactly-once 보장은 아닙니다.", "Inspect outbox pending, publication failures, Kafka lag and worker records separately. This is not end-to-end exactly-once."),
      both("OrderService, OutboxRelay, FulfillmentService의 각 경계를 확인하세요.", "Inspect boundaries in OrderService, OutboxRelay and FulfillmentService."),
    ], "apps/demo-api/src/main/java/io/incidentlens/demoapi/OutboxRelay.java")],
  },
  {
    id: "diagnose", title: both("06 · 장애 분석과 회복", "06 · Diagnose and recover"),
    goal: both("관찰 사실과 원인 가설을 구분하고 동일 조건으로 회복을 재측정한다.", "Separate observations from causal hypotheses and remeasure recovery under comparable conditions."),
    situation: both("느린 응답 하나만으로는 DB, 외부 연동, worker, 캐시 중 어디가 문제인지 알 수 없습니다.", "One slow response cannot reveal whether the bottleneck is DB, downstream simulation, worker or cache."),
    question: both("BEFORE p95가 높고 AFTER가 낮으면 원인이 확정됐을까요?", "If BEFORE p95 is high and AFTER is low, is the cause proven?"),
    answer: both("아니요. 동일 사용자 수·시간·데이터 상태와 다른 트래픽을 확인하고, 인용된 증거와 추가 확인 사항을 검토해야 합니다.", "No. Check user count, duration, data state and competing traffic, then review cited evidence and open questions."),
    hint: both("측정값, 해석, 검증이 필요한 가정을 각각 적어 보세요.", "Write down a measured value, its interpretation and what still needs verification."),
    topics: [
      topic(both("지표·로그·추적", "Metrics, logs and traces"), [
        both("단일 응답 시간은 느린 위치와 실패 이유를 설명하지 못합니다.", "One response time cannot locate the slow boundary or explain a failure."),
        both("계기판은 추세, 작업 일지는 사건, 이동 기록은 지나간 경로를 보여줍니다.", "A dashboard shows trends, a work journal records events, a route log shows the path taken."),
        both("지표는 p95·lag·적중률을, 로그는 오류·이벤트를, 추적은 요청의 구간을 보여줍니다. 상세 관측 스택은 선택 사항입니다.", "Metrics show p95, lag and hit rate; logs show events/errors; traces show request spans. The full observability stack is optional."),
        both("서로 다른 관찰을 연결해 가설을 반박하거나 보강할 수 있습니다.", "Combined observations can challenge or support a hypothesis."),
        both("수집 비용과 누락이 있습니다. 작은 서비스는 구조화된 로그와 기본 지표부터 시작할 수 있습니다.", "Collection has cost and gaps. A small service can start with structured logs and basic metrics."),
        both("미측정은 0이 아닙니다. 타임 윈도와 단위, 다른 트래픽을 확인하세요.", "Missing is not zero. Check window, units and unrelated traffic."),
        both("EvidenceCollector의 측정 항목과 수집 공백 처리를 확인하세요.", "Inspect measured fields and collection gaps in EvidenceCollector."),
      ], "apps/control-plane/src/main/java/io/incidentlens/control/EvidenceCollector.java"),
      topic(both("RCA와 선택적 LLM", "RCA and optional LLM"), [
        both("증상만 보고 원인을 단정하면 잘못된 복구를 할 수 있습니다.", "Guessing a cause from symptoms can lead to the wrong recovery."),
        both("탐정이 관찰 기록과 가설을 구분하고 반증을 찾는 과정입니다.", "It is like a detective separating observations from theories and looking for counterevidence."),
        both("기본 규칙 분석은 증거 ID를 인용해 가설·영향·불확실성을 만듭니다. 설정된 호환 LLM은 선택적으로 보고서를 생성하며 실패하면 규칙 분석으로 돌아갑니다.", "Default rules cite evidence IDs in hypotheses, impact and uncertainties. A configured compatible LLM can generate a report; failure falls back to rules."),
        both("유료 API 없이도 근거를 검토하는 흐름을 유지하기 위해 규칙 분석을 기본으로 둡니다.", "Rules keep evidence review available without a paid API."),
        both("규칙도 AI도 확정 진단이 아닙니다. 원본 로그·보고서는 작성 언어 그대로 보존됩니다.", "Neither rules nor AI give a definitive diagnosis. Raw logs and reports retain their original language."),
        both("보고서의 인용 ID, 원인 가설, 불확실성, 회복 측정값을 나눠 확인합니다.", "Review cited IDs, causal hypothesis, uncertainties and recovery measurements separately."),
        both("RuleBasedRcaProvider와 RcaResponseBody의 65,536바이트 응답 제한·취소 처리를 확인하세요.", "Inspect RuleBasedRcaProvider and RcaResponseBody's 65,536-byte response limit and cancellation."),
      ], "apps/control-plane/src/main/java/io/incidentlens/control/RuleBasedRcaProvider.java"),
    ],
  },
];

export const scenarios: { id: Scenario; title: Text; change: Text; observe: Text; question: Text; expected: Text; parameter: number }[] = [
  { id: "DOWNSTREAM_LATENCY", title: both("외부 연동 지연", "Downstream delay"), change: both("상품 조회의 재고 조회 시뮬레이션을 지연합니다. 1,500ms를 넘으면 제한 시간 오류가 납니다.", "Delay the simulated inventory lookup on catalog reads; above 1,500ms it times out."), observe: both("요청 p95·timeout 이벤트·추적 구간", "Request p95, timeout events and trace span"), question: both("재고 조회가 느리면 어디의 p95가 오르고 무엇이 오류가 될까요?", "If inventory lookup slows, which p95 rises and when is there an error?"), expected: both("카탈로그 요청 p95가 오를 수 있습니다. 설정 지연이 1,500ms를 넘으면 시뮬레이션이 timeout 오류를 냅니다. 실제 값은 측정 전에는 알 수 없습니다.", "Catalog request p95 may rise. A configured delay above 1,500ms causes a simulated timeout. Actual values require measurement."), parameter: 350 },
  { id: "DATABASE_DEGRADATION", title: both("DB 비효율", "Inefficient database"), change: both("상품 조회에서 비효율 조회와 캐시 우회를 함께 켭니다.", "Use inefficient catalog queries and bypass cache together."), observe: both("DB 조회 시간·논리적 DB 로드·요청 p95", "DB query duration, logical DB loads and request p95"), question: both("DB 조회와 캐시 우회를 동시에 바꾸면 요청 p95만으로 어느 효과인지 구분할 수 있을까요?", "If query behavior and cache bypass change together, can request p95 isolate either effect?"), expected: both("아니요. DB 조회 시간과 로드, 캐시 우회 이벤트를 함께 봐야 합니다. 단일 원인의 성능 개선이라고 주장할 수 없습니다.", "No. Inspect DB duration, loads and cache-bypass events together. You cannot claim a single cause for improvement."), parameter: 0 },
  { id: "KAFKA_SLOWDOWN", title: both("worker 지연", "Worker slowdown"), change: both("주문 이벤트를 처리하는 worker에 지연을 넣습니다.", "Delay the worker processing each order event."), observe: both("Kafka lag·처리 이벤트·재시도", "Kafka lag, processing events and retries"), question: both("주문 접수 HTTP가 성공해도 worker가 느리면 무엇이 쌓일까요?", "If HTTP accepts orders but the worker slows, what accumulates?"), expected: both("Kafka 소비 대기량이 증가할 수 있습니다. lag와 처리 이벤트, 재시도를 확인하고 해제 후 대기량이 줄어드는지 봅니다.", "Consumer lag may rise. Check lag, processing events and retries, then verify it drains after recovery."), parameter: 500 },
  { id: "CACHE_DEGRADATION", title: both("캐시 우회", "Cache bypass"), change: both("상품 목록의 Redis 읽기와 요청 모으기를 우회합니다.", "Bypass Redis reads and request coalescing for catalog lists."), observe: both("캐시 적중률·DB 로드·요청 p95", "Cache hit rate, DB loads and request p95"), question: both("반복 조회가 Redis를 건너뛰면 어떤 증거가 나타날까요?", "What evidence would repeated reads produce when they bypass Redis?"), expected: both("CACHE_BYPASS 이벤트와 DB 로드 증가가 예상됩니다. 적중률은 실제 수집값을 확인하고, 해제 후 캐시가 다시 데워질 시간을 고려합니다.", "Expect CACHE_BYPASS events and more DB loads. Inspect measured hit rate and allow for cache warm-up after recovery."), parameter: 0 },
];
