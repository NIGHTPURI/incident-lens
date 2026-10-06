import type { Locale } from "../i18n/translations";
import { additionalGuides } from "./technology-additions";

export type Copy = { ko: string; en: string };
export const both = (ko: string, en: string): Copy => ({ ko, en });
export type Guide = {
  id: string; name: string; group: "core" | "data" | "observe" | "tools";
  stage?: string; mode: "core" | "optional";
  problem: Copy; oldWay: Copy; purpose: Copy; boundary: Copy;
  flow: Copy; example: string; exampleNote: Copy; inLab: Copy;
  observe: Copy; diagnose: Copy; alternatives: Copy;
  guided: Copy; independent: Copy; source: string;
};
export const technologyGroups = [
  { id: "core", ko: "앱과 실행", en: "Apps & runtime" },
  { id: "data", ko: "데이터와 메시징", en: "Data & messaging" },
  { id: "observe", ko: "관측과 부하", en: "Observability & load" },
  { id: "tools", ko: "화면과 보조 도구", en: "UI & supporting tools" },
] as const;
export const technologySections = [
  { id: "need", ko: "왜 필요한가", en: "Why it appears" },
  { id: "flow", ko: "작동 흐름", en: "How it works" },
  { id: "example", ko: "작은 예시", en: "Small example" },
  { id: "lab", ko: "이 실험실에서", en: "In this lab" },
  { id: "failure", ko: "실패와 선택", en: "Failure & tradeoffs" },
  { id: "practice", ko: "직접 익히기", en: "Practice" },
] as const;
export const technologyGuides: Guide[] = [
  {
    id: "redis", name: "Redis", group: "data", stage: "performance", mode: "core",
    problem: both("상품 목록을 요청할 때마다 같은 MySQL 조회를 반복하면 DB 작업과 대기 시간이 늘 수 있습니다.", "Repeated catalog reads can make MySQL do the same work and add waiting time."),
    oldWay: both("먼저 SQL·인덱스와 실제 병목을 확인합니다. 프로세스 안의 Map도 중복 조회를 줄이지만 여러 API 인스턴스가 값을 공유하지 못하고 재시작하면 사라집니다.", "First inspect SQL, indexes and the measured bottleneck. An in-process Map also avoids repeated reads, but replicas do not share it and restart loses it."),
    purpose: both("Redis는 네트워크로 공유하는 메모리 중심 저장소입니다. 이 앱에서는 짧게 유효한 상품 목록 캐시와 만료되는 장애 설정을 둡니다.", "Redis is a networked, memory-oriented data store. Here it holds short-lived catalog cache entries and expiring fault settings."),
    boundary: both("상품·주문 원본은 MySQL입니다. Redis 적중은 원본 DB 커밋이나 캐시 최신성을 증명하지 않으며, 이 데모의 고정 상품 목록에는 쓰기 무효화가 없습니다.", "MySQL is authoritative for products and orders. A Redis hit proves neither a database commit nor freshness; this demo's immutable catalog has no write invalidation protocol."),
    flow: both("GET 상품 목록 → 카테고리 키 조회 → 적중이면 반환 → 미적중이면 범위가 정해진 로컬 잠금 아래 MySQL 조회 → TTL 25–35초 캐시 → 응답. 장애 우회 시 Redis를 건너뛰고 DB로 갑니다.", "GET catalog → look up category key → return hit; on miss, query MySQL under a bounded local lock → cache for 25–35 seconds → respond. Cache-bypass fault skips Redis and goes to MySQL."),
    example: "GET incidentlens:catalog:v1:books\n# miss: query MySQL, then cache the serialized page\nSET incidentlens:catalog:v1:books '<page-json>' EX 30",
    exampleNote: both("설명용 Redis 명령입니다. 이 화면은 Redis를 호출하지 않으며 예시의 값도 실제 실험 결과가 아닙니다.", "Illustrative Redis commands. This page does not call Redis; the value is not a measured lab result."),
    inLab: both("demo-api의 catalog cache와 incidentlens:fault 키가 Redis를 씁니다. CACHE_DEGRADATION은 목록 요청에서 캐시와 요청 합치기를 우회합니다. 장애 설정은 세션 소유자와 만료 시간으로 제한됩니다.", "demo-api uses Redis for the catalog cache and the incidentlens:fault key. CACHE_DEGRADATION bypasses cache and request coalescing on catalog reads. Fault state has an owner and expiry."),
    observe: both("실험 증거에서 캐시 적중률, 카탈로그 DB 작업 수·p95, HTTP p95를 함께 봅니다. 적중률만으로 Redis 장애나 원인을 확정하지 않습니다.", "Inspect cache hit rate, catalog DB operations/p95 and HTTP p95 together in experiment evidence. Hit rate alone cannot prove a Redis failure or root cause."),
    diagnose: both("명령 경로가 잘못되면 키/TTL을, 적중률 저하는 요청 분포·만료·우회 상태를, DB 부하 증가는 fallback과 중복 미스를 확인합니다. Redis가 죽으면 장애 주입을 안전하게 끄고 DB fallback은 과부하로 실패할 수도 있습니다.", "Check key/TTL for command issues; request mix, expiry and bypass for low hit rate; fallback and duplicate misses for DB load. A Redis failure disables fault injection; DB fallback may still overload."),
    alternatives: both("작은 앱은 DB 인덱스나 프로세스 캐시만으로 충분할 수 있습니다. Redis는 네트워크 실패·메모리 한도·만료·무효화 비용을 추가하므로 측정 없이 기본값으로 넣지 않습니다.", "A small app may only need an index or local cache. Redis adds network failure, memory limits, expiry and invalidation work, so add it only after measurement."),
    guided: both("12단계의 Map TTL 모형과 실제 demo-api의 캐시 경로를 비교하고, 캐시 미스가 생기는 지점을 손으로 표시하세요.", "Compare the stage-12 Map TTL model with demo-api's cache path, and mark where misses occur."),
    independent: both("상품 가격이 수정되는 요구사항이 생긴다고 가정하세요. TTL 안의 오래된 값을 어떻게 막을지, Redis 장애 때 어떤 HTTP 결과를 허용할지 적고 근거를 설명하세요.", "Suppose product prices become editable. Design how to avoid stale values within the TTL and which HTTP outcomes are acceptable during a Redis outage."),
    source: "https://redis.io/docs/latest/develop/use/",
  },
  {
    id: "kafka", name: "Apache Kafka", group: "data", stage: "messaging", mode: "core",
    problem: both("주문 HTTP 요청 안에서 후속 처리까지 끝내면 느린 worker가 응답을 붙잡고, 처리 실패가 주문 접수와 섞입니다.", "Doing all follow-up work inside the order HTTP request makes a slow worker hold the response and mixes fulfillment failure with order acceptance."),
    oldWay: both("한 프로세스의 작업 큐는 간단하지만 재시작·다중 소비자·재처리 요구를 직접 다뤄야 합니다. DB 저장 직후 곧바로 메시지를 보내면 그 사이의 크래시가 발행 의도를 잃게 할 수 있습니다.", "An in-process queue is simple but needs custom restart, multi-consumer and replay handling. Sending just after a DB commit can lose publication intent on a crash."),
    purpose: both("Kafka는 파티션 로그에 이벤트를 보관하고 소비자 그룹이 offset으로 읽는 브로커입니다. 이 앱은 주문 접수와 후속 fulfillment를 분리합니다.", "Kafka stores events in partitioned logs and consumer groups read with offsets. Here it separates order acceptance from later fulfillment."),
    boundary: both("Kafka의 수신 확인은 worker 업무 완료가 아닙니다. 파티션 안의 순서와 앱의 최종 효과 순서는 다를 수 있으며 MySQL·Kafka 전체에 대한 exactly-once를 주장하지 않습니다.", "Kafka acknowledgement is not worker completion. Partition append order can differ from application effects; this app makes no end-to-end exactly-once claim across MySQL and Kafka."),
    flow: both("demo-api가 order+outbox를 한 MySQL 트랜잭션으로 저장 → relay가 outbox를 주장하고 Kafka에 발행 → demo-worker가 소비 → 처리 ID와 fulfillment를 한 DB 트랜잭션으로 저장 → offset 확인. 중복 전달은 처리 ID가 막습니다.", "demo-api commits order+outbox in one MySQL transaction → relay claims the outbox and publishes to Kafka → demo-worker consumes → writes processed ID and fulfillment in one DB transaction → acknowledges offset. Processed IDs guard duplicate effects."),
    example: "POST /api/orders + Idempotency-Key\nMySQL: purchase_order + outbox_event (one commit)\nKafka: incidentlens.orders.v1, key=orderId\nWorker DB: processed_event + fulfillment (one commit)",
    exampleNote: both("이것은 실제 저장소의 흐름을 요약한 도식이며 브라우저에서 새 주문을 만들거나 Kafka를 호출하지 않습니다.", "This summarizes the repository's real flow; this page creates no order and calls no Kafka broker."),
    inLab: both("KAFKA_SLOWDOWN은 선택한 사고의 이벤트 처리를 0–3000ms 지연합니다. 메인 토픽은 incidentlens.orders.v1, 실패 격리 토픽은 .dlq입니다. 로컬 Compose는 단일 브로커/복제계수 1입니다.", "KAFKA_SLOWDOWN delays selected incident events by 0–3000 ms. The main topic is incidentlens.orders.v1 and failures can reach its .dlq topic. Local Compose has one broker and replication factor one."),
    observe: both("실험 증거에서 worker 처리 수·재시도·Kafka 소비자 lag와 outbox pending을 구분합니다. lag는 공유 gauge이며 특정 사고의 대기량이라고 단정할 수 없습니다.", "Separate worker processed/retry counts, consumer lag and outbox pending in evidence. Lag is a shared gauge, not a per-incident queue depth."),
    diagnose: both("HTTP 201인데 처리 수가 멈췄다면 outbox 발행 전인지, broker에 들어갔는지, worker가 실패/재시도/DLQ에 있는지 순서대로 확인합니다. offset을 커밋하기 전 worker가 죽으면 재전달될 수 있습니다.", "If HTTP returns 201 but processing stops, inspect pending outbox, broker publication, then worker retry/DLQ. A worker crash before offset commit can cause redelivery."),
    alternatives: both("간단한 앱은 동기 처리나 DB 작업표만으로 충분할 수 있습니다. Kafka는 브로커 운영, 스키마, 중복 처리, 재처리와 순서 설계 비용이 있습니다.", "A simple app may use synchronous work or a database job table. Kafka adds broker operations, schema, deduplication, replay and ordering design costs."),
    guided: both("14단계의 로컬 broker 모형에서 'DB 커밋 후 발행 확인 전'과 'worker DB 커밋 후 offset 확인 전' 두 크래시 지점을 표시하세요.", "In the stage-14 local broker model, mark crashes after DB commit before publish acknowledgement and after worker DB commit before offset acknowledgement."),
    independent: both("주문 접수는 성공했는데 worker가 같은 이벤트를 두 번 받았습니다. 사용자가 봐야 할 상태와 DB 제약, 재시도/DLQ 판단을 설계하세요.", "An accepted order reaches the worker twice. Design the user-visible status, database constraints and retry/DLQ decision."),
    source: "https://kafka.apache.org/documentation/",
  },
  {
    id: "prometheus", name: "Prometheus", group: "observe", stage: "observability", mode: "optional",
    problem: both("한 번의 오류 로그만으로 전체 요청의 지연 분포나 시간에 따른 변화는 알기 어렵습니다.", "One error log cannot show the request latency distribution or how it changes over time."),
    oldWay: both("프로세스 안의 카운터는 재시작하면 사라지고 장기간 비교가 어렵습니다. IncidentLens의 직접 수집 증거는 사고 범위가 좁지만 영구 시계열 저장소가 아닙니다.", "In-process counters disappear on restart and are hard to compare over time. IncidentLens direct evidence is incident-scoped but is not a long-term time-series store."),
    purpose: both("Prometheus는 대상의 /actuator/prometheus를 주기적으로 스크레이프해 수치 시계열을 저장하고 PromQL로 질의합니다. 그래프를 그리는 Grafana와 역할이 다릅니다.", "Prometheus scrapes /actuator/prometheus periodically, stores numeric time series and exposes PromQL queries. Grafana is a separate visualization layer."),
    boundary: both("사고 ID를 metric label로 넣으면 시계열 수가 폭증할 수 있어 이 앱은 낮은 cardinality label을 씁니다. Prometheus 수치만으로 특정 요청의 원인과 로그 내용을 알 수 없습니다.", "Incident IDs as metric labels can explode series cardinality, so this app uses low-cardinality labels. Metrics alone cannot explain an individual request or its log content."),
    flow: both("세 Java 서비스의 Micrometer/Actuator 지표 → Prometheus가 5초마다 수집 → 저장된 시계열에 PromQL 질의 → Grafana가 결과를 시각화합니다.", "Micrometer/Actuator metrics from three Java services → Prometheus scrapes every five seconds → PromQL queries stored series → Grafana visualizes them."),
    example: "sum(rate(incidentlens_workload_requests_total[1m]))\n# Request rate over a one-minute window; illustrative query",
    exampleNote: both("설명용 PromQL입니다. 실제 대시보드 값이나 장애 측정 결과를 만들지 않습니다.", "Illustrative PromQL; this page does not generate dashboard values or incident measurements."),
    inLab: both("Compose observability 프로필에서만 시작합니다. control-plane:8080, demo-api:8081, demo-worker:8082를 스크레이프하고 24시간/512MB 보존 한도를 둡니다.", "It starts only in the Compose observability profile, scrapes control-plane:8080, demo-api:8081 and demo-worker:8082, and has 24-hour/512MB retention limits."),
    observe: both("대시보드에서 요청률, 오류율, 지연, DB·캐시·Kafka 지표를 보되, 실험실의 사고별 BEFORE/AFTER 증거와 범위가 다름을 비교하세요.", "Inspect request rate, errors, latency and DB/cache/Kafka metrics in a dashboard, while comparing their scope with incident-specific BEFORE/AFTER evidence."),
    diagnose: both("그래프가 비면 대상 서비스 상태 → /actuator/prometheus 응답 → Prometheus target 상태 → 쿼리와 시간 범위를 차례로 봅니다. 빈 시계열을 0이라고 꾸미지 않습니다.", "For an empty graph, check service health, /actuator/prometheus, target status, then query/time range. Do not turn missing series into zero."),
    alternatives: both("작은 로컬 실습은 앱의 직접 증거만으로 시작할 수 있습니다. Prometheus는 스크레이프·저장·label 관리 비용이 있으며 추적·로그 저장을 대신하지 않습니다.", "A small local exercise can start with direct app evidence. Prometheus adds scrape, storage and label management; it does not replace traces or logs."),
    guided: both("요청 카운터와 p95가 어떤 질문에 각각 답하는지 적고, 사고 ID label 없이 한 사고를 좁혀 보는 한계를 설명하세요.", "State what request counters and p95 each answer, and explain the limit of investigating one incident without an incident-ID label."),
    independent: both("요청 p95가 오르지만 오류율은 그대로인 경우, DB p95·캐시 적중률·Kafka lag 중 무엇을 함께 볼지 순서를 정하고 반례를 적으세요.", "When p95 rises without more errors, order your checks of DB p95, cache hit rate and Kafka lag, including one counterexample."),
    source: "https://prometheus.io/docs/introduction/overview/",
  },
  {
    id: "grafana", name: "Grafana", group: "observe", stage: "observability", mode: "optional",
    problem: both("Prometheus 수치, Loki 로그, Tempo trace가 각자 다른 화면에 있으면 같은 시간대의 문제를 연결하기 어렵습니다.", "Prometheus metrics, Loki logs and Tempo traces are harder to correlate across separate interfaces."),
    oldWay: both("각 저장소를 직접 질의할 수 있지만 여러 신호의 시간 범위와 필터를 손으로 맞춰야 합니다.", "You can query each store directly, but must align time ranges and filters yourself."),
    purpose: both("Grafana는 구성된 데이터 소스를 질의해 대시보드와 Explore에서 시각화합니다. 이 Compose에서는 Prometheus·Loki·Tempo를 연결합니다.", "Grafana queries configured data sources and visualizes them in dashboards and Explore. This Compose connects Prometheus, Loki and Tempo."),
    boundary: both("Grafana 자체가 이 앱의 metric/log/trace를 수집·저장하지 않습니다. 패널이 비었다고 곧바로 데이터 0이나 서비스 정상이라는 뜻은 아닙니다.", "Grafana itself does not collect or store this app's metrics, logs or traces. An empty panel does not mean zero data or a healthy service."),
    flow: both("서비스가 지표·로그·trace를 냄 → Prometheus 및 OTel→Loki/Tempo가 보관 → Grafana가 각 데이터 소스를 조회 → 사용자가 같은 시간과 ID로 비교합니다.", "Services emit metrics, logs and traces → Prometheus and OTel→Loki/Tempo store them → Grafana queries each source → the learner aligns time and identifiers."),
    example: "Prometheus panel: request rate / latency\nLoki Explore: service + correlationId\nTempo Explore: traceId\n# Three different data sources; no live query here",
    exampleNote: both("가상 탐색 순서입니다. 이 화면은 Grafana 패널을 실행하거나 실제 trace를 가져오지 않습니다.", "Illustrative exploration sequence. This page runs no Grafana panel or live trace lookup."),
    inLab: both("observability 프로필의 선택 서비스이며 infra/grafana에서 데이터 소스와 IncidentLens 대시보드를 프로비저닝합니다. 핵심 사고 증거 수집은 Grafana 없이도 동작합니다.", "It is an optional observability-profile service. infra/grafana provisions data sources and an IncidentLens dashboard. Core incident evidence works without Grafana."),
    observe: both("동일한 BEFORE 시간 범위에서 요청 지연 패널을 보고 관련 로그와 trace로 내려가세요. 데이터 소스별 범위가 다른 공유 gauge와 사고별 증거를 섞지 않습니다.", "In the same BEFORE window, inspect request latency then related logs/traces. Do not conflate shared gauges with incident-scoped evidence."),
    diagnose: both("빈 패널이면 데이터 소스 연결, Prometheus targets, OTel Collector pipeline, 시간 범위와 필터를 순서대로 확인합니다. trace 누락은 Java agent 비활성일 수 있습니다.", "For an empty panel, check data-source connection, Prometheus targets, OTel pipeline, time range and filters. Missing traces may mean the Java agent is disabled."),
    alternatives: both("한두 수치만 볼 때는 Prometheus UI와 앱의 직접 증거가 충분할 수 있습니다. Grafana는 비교·탐색에 도움을 주지만 잘못된 쿼리나 범위 판단까지 고치지는 않습니다.", "For one or two numbers, Prometheus UI and direct app evidence may suffice. Grafana helps exploration but cannot fix wrong queries or scope assumptions."),
    guided: both("같은 요청의 수치·로그·trace가 각각 답하는 질문을 한 문장씩 쓰고, Grafana가 어느 것을 보관하는지 확인하세요.", "Write one question each answered by a metric, log and trace for one request, then identify which of these Grafana stores."),
    independent: both("p95가 상승했지만 Grafana의 로그 패널이 비었다고 가정하세요. 원인 단정 없이 확인할 네 경계를 순서대로 설명하세요.", "Suppose p95 rises while the Grafana log panel is empty. Explain four boundaries to check before claiming a cause."),
    source: "https://grafana.com/docs/grafana/latest/datasources/",
  },
  ...additionalGuides,
];

export function TechnologyGuide({ id, locale, onStage, languageName = "Java" }: { id: string; locale: Locale; onStage: (id: string) => void; languageName?: string }) {
  const guide = technologyGuides.find(item => item.id === id)!;
  const t = (copy: Copy) => copy[locale];
  const label = (ko: string, en: string) => locale === "ko" ? ko : en;
  return <article className="programming-guide technology-guide">
    <header className="learning-header"><span className="learning-kicker">{label("실험실 기술 안내", "Lab technology guide")} · {guide.mode === "optional" ? label("선택 프로필", "Optional profile") : label("기본 구성", "Core stack")}</span><h1>{guide.name}</h1><p>{label("실험실의 실제 구성과 학습용 예시를 구분해 설명합니다. 가이드를 읽는 것은 실행·숙련 기록이 아닙니다.", "The guide separates actual lab configuration from illustrative examples. Reading it is not a run or mastery record.")}</p></header>
    <section aria-labelledby="tech-need"><h2 id="tech-need" tabIndex={-1}>{label("왜 필요한가", "Why it appears")}</h2><h3>{label("무엇인가 · 왜 사용하는가", "What it is & why to use it")}</h3><p>{t(guide.purpose)}</p><h3>{label("등장한 문제", "The problem it addresses")}</h3><p>{t(guide.problem)}</p><p>{t(guide.oldWay)}</p><div className="learning-box"><strong>{label("하지 않는 일", "What it does not do")}</strong><p>{t(guide.boundary)}</p></div></section>
    <section aria-labelledby="tech-flow"><h2 id="tech-flow" tabIndex={-1}>{label("작동 흐름", "How it works")}</h2><p className="technology-flow">{t(guide.flow)}</p></section>
    <section aria-labelledby="tech-example"><h2 id="tech-example" tabIndex={-1}>{label("작은 예시", "Small example")}</h2><pre><code>{guide.example}</code></pre><p>{t(guide.exampleNote)}</p></section>
    <section aria-labelledby="tech-lab"><h2 id="tech-lab" tabIndex={-1}>{label("이 실험실에서", "In this lab")}</h2><p>{t(guide.inLab)}</p><h3>{label("실험과 증거", "Experiment and evidence")}</h3><p>{t(guide.observe)}</p>{guide.stage && <button className="learn-secondary" onClick={() => onStage(guide.stage!)}>{label(`관련 ${languageName} 수업 열기`, `Open related ${languageName} lesson`)} ↗</button>}</section>
    <section aria-labelledby="tech-failure"><h2 id="tech-failure" tabIndex={-1}>{label("실패와 선택", "Failure & tradeoffs")}</h2><p>{t(guide.diagnose)}</p><p>{t(guide.alternatives)}</p></section>
    <section aria-labelledby="tech-practice"><h2 id="tech-practice" tabIndex={-1}>{label("직접 익히기", "Practice")}</h2><h3>{label("안내 실습", "Guided")}</h3><p>{t(guide.guided)}</p><h3>{label("독립 과제", "Independent")}</h3><p>{t(guide.independent)}</p><p>{label("이 화면은 실습 결과를 저장·채점하지 않습니다.", "This page does not save or grade your result.")}</p><a href={guide.source} target="_blank" rel="noreferrer">{label("참고 자료", "Reference")} ↗</a></section>
  </article>;
}
