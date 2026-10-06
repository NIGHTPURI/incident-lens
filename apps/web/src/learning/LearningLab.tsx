import { useEffect, useState } from "react";
import { readCodeLanguage } from "./programming-tracks";
import ExecutionDetails from "../ExecutionDetails";
import Curriculum from "./Curriculum";
import type { Overview, IncidentSession, Scenario, SessionDetail, Workload } from "../types";
import { useI18n } from "../i18n/I18nProvider";
import { both, lessons, scenarios } from "./content";
import type { Text } from "./content";

const copy = {
  module: both("백엔드 학습실", "Backend Learning"),
  welcome: both("요청 한 번이 지나가는 길을 따라가 보세요.", "Follow the path of a single request."),
  intro: both("개념을 읽고 결과를 예측한 뒤, 준비가 되면 로컬 장애를 직접 켜고 측정합니다. 설명은 서비스 없이도 읽을 수 있습니다.", "Read the idea, predict a result, then enable and measure a local fault when ready. Lessons work without running services."),
  first: both("첫 학습 시작", "Start first lesson"),
  resume: both("이어서 학습", "Continue learning"),
  list: both("학습 목록", "Lesson list"),
  choose: both("학습 선택", "Choose a lesson"),
  free: both("자유 실험", "Free experiment"),
  goal: both("이번 학습 목표", "Learning goal"),
  flow: both("요청·데이터 흐름", "Request and data flow"),
  flowHelp: both("노드와 화살표를 눌러 역할, 데이터, 순서와 실패 지점을 확인하세요. 이 그림은 설명용이며 실시간 추적이 아닙니다.", "Select nodes and arrows to inspect their role, data, order and failure point. This is an explanatory diagram, not a live trace."),
  catalog: both("상품 조회 경로", "Catalog read path"),
  order: both("주문 비동기 경로", "Async order path"),
  cacheHit: both("적중: Redis → HTTP 응답 (DB 생략)", "Hit: Redis → HTTP response (skip DB)"),
  cacheMiss: both("미적중·우회: MySQL → HTTP 응답", "Miss or bypass: MySQL → HTTP response"),
  orderResponse: both("주문+outbox 커밋 → HTTP 응답. relay와 worker는 나중에 실행될 수 있음", "Order + outbox commit → HTTP response. Relay and worker may run later"),
  role: both("역할", "Role"), data: both("이동 데이터", "Data"), why: both("이 순서인 이유", "Why this order"), failure: both("실패하면", "Possible failure"),
  predict: both("먼저 결과를 예측해 보세요", "Predict the result first"),
  prediction: both("내 예측", "My prediction"),
  predictionPlaceholder: both("어디가 느려지고 어떤 증거가 나타날까요?", "What slows down, and what evidence might appear?"),
  reveal: both("해설 보기", "Reveal explanation"),
  hide: both("해설 접기", "Hide explanation"),
  explanation: both("실제 동작 해설", "What actually happens"),
  technical: both("기술과 선택 이유", "Technology and tradeoffs"),
  sections: [both("문제 상황", "Problem"), both("쉬운 비유", "Analogy"), both("실제 동작", "How it works"), both("선택 이유", "Why choose it"), both("단점·대안", "Tradeoffs and alternative"), both("장애 증상", "Failure symptoms"), both("근거·관련 코드", "Evidence and code")],
  code: both("관련 코드 열기", "Open related code"),
  next: both("다음 학습", "Next lesson"),
  previous: both("이전 학습", "Previous lesson"),
  coach: both("학습 도움", "Learning help"),
  coachAbout: both("작성된 설명과 단계별 힌트입니다. AI 대화가 아닙니다.", "Written explanations and step hints. This is not an AI chat."),
  coachStage: both("현재 단계", "Current stage"),
  terms: both("지금 알아둘 말", "Terms for this step"),
  hint: both("힌트", "Hint"),
  compare: both("예측과 해설 비교", "Compare prediction and explanation"),
  noPrediction: both("예측을 적으면 여기에서도 비교할 수 있습니다.", "Write a prediction to compare it here."),
  showHelp: both("학습 도움 열기", "Open learning help"),
  hideHelp: both("학습 도움 닫기", "Close learning help"),
  experiments: both("네 가지 로컬 장애 실험", "Four local fault experiments"),
  background: both("배경 이해", "Understand the setting"),
  observe: both("관찰할 증거", "Evidence to inspect"),
  configure: both("실험 설정", "Experiment setup"),
  service: both("서비스 연결", "Service connection"),
  offline: both("서비스에 연결되지 않았습니다. 개념은 읽을 수 있지만 실험 결과는 없습니다.", "Services are disconnected. Lessons remain readable; there are no experiment results."),
  unknown: both("연결 상태를 확인하는 중입니다.", "Checking service connection."),
  connected: both("로컬 컨트롤 플레인에 연결되었습니다. 실행 전 전체 서비스 상태를 확인하세요.", "Connected to the local control plane. Check all service health before running."),
  scope: both("선택한 세션의 요청·이벤트에만 적용됩니다. 한 번에 장애 하나이며 15분 후 만료됩니다. 해제 버튼으로 즉시 끌 수 있습니다.", "Applies only to requests and events with the selected session ID. One fault at a time; it expires after 15 minutes and can be disabled immediately."),
  create: both("이 장애로 세션 만들기", "Create session for this fault"),
  session: both("실험 세션", "Experiment session"),
  noSession: both("먼저 이 장애의 세션을 만드세요.", "Create a session for this fault first."),
  parameter: both("지연 시간 (ms, 0~2000)", "Delay (ms, 0–2000)"),
  enable: both("장애 켜기", "Enable fault"),
  disable: both("장애 해제", "Disable fault"),
  otherFault: both("다른 세션의 장애가 활성화돼 있습니다. 먼저 그 장애를 해제하세요.", "A fault for another session is active. Disable it first."),
  before: both("BEFORE 증거 수집", "Collect BEFORE evidence"),
  after: both("AFTER 증거 수집", "Collect AFTER evidence"),
  rca: both("근거 기반 RCA 생성", "Generate evidence-based RCA"),
  rcaHelp: both("RCA는 관찰 사실과 분리된 원인 가설입니다. 인용 증거와 추가 확인 사항을 검토하세요.", "RCA is a causal hypothesis separate from observations. Review citations and open questions."),
  prepare: both("비교 실험 만들기", "Prepare comparison"),
  users: both("가상 사용자 수", "Virtual users"),
  duration: both("실행 시간 (초)", "Duration (seconds)"),
  command: both("터미널에서 실행", "Run in a terminal"),
  commandHelp: both("브라우저는 k6를 실행하지 않습니다. 이 명령은 로컬 Docker Compose에서 BEFORE를 장애 활성 상태로, AFTER를 해제 상태로 실행합니다. Ctrl+C 시 정리를 시도하므로 종료 후 장애 상태를 확인하세요. 실행 후 새로고침해 저장 결과를 확인하세요.", "The browser does not run k6. This command runs BEFORE with the fault active and AFTER after disabling it in local Docker Compose. Ctrl+C attempts cleanup; check fault state afterward. Refresh to inspect saved results."),
  measured: both("저장된 실측 비교", "Stored measured comparison"),
  eventsUnit: both("건", "events"),
  kafkaLag: both("Kafka 소비 대기량", "Kafka consumer lag"),
  missing: both("아직 측정되지 않았습니다", "Not measured yet"),
  conditions: both("동일한 가상 사용자 수·시간을 사용해도 캐시 온도, 기존 대기량, 다른 트래픽이 다를 수 있습니다. DB 비효율 실험은 캐시도 우회합니다.", "Even with the same virtual users and duration, cache warmth, backlog and other traffic can differ. The database fault also bypasses cache."),
  reflect: both("회고: 어떤 관찰이 가설을 지지하고, 무엇을 더 확인해야 할까요?", "Reflect: what observations support your hypothesis, and what still needs checking?"),
  experimentPrediction: both("이 장애의 결과를 먼저 예측", "Predict this fault's result"),
  scenarioReveal: both("예상되는 증상 보기", "Reveal expected symptoms"),
  workflow: both("실험 순서", "Experiment sequence"),
  steps: [both("배경 읽기", "Read background"), both("결과 예측", "Predict result"), both("명시적으로 실행", "Run explicitly"), both("증거 관찰", "Inspect evidence"), both("원인 해석", "Interpret cause"), both("장애 해제", "Disable fault"), both("회복 재측정", "Remeasure recovery"), both("회고", "Reflect")],
  notes: both("회고 메모", "Reflection notes"),
  raw: both("원문 보고서 (생성 언어 그대로)", "Original report (as generated)"),
  observations: both("관찰 사실 (원문)", "Observed facts (original text)"),
  unknownPhase: both("단계 정보 없음", "Phase unavailable"),
  hypothesis: both("원인 가설", "Causal hypothesis"),
  impact: both("추정 영향", "Estimated impact"),
  citations: both("인용 증거 ID", "Cited evidence IDs"),
  further: both("추가 확인 사항", "Further checks"),
  noFurther: both("보고서에 추가 확인 사항이 적히지 않았습니다.", "No further checks were listed in the report."),
  originalLanguage: both("원문 언어 (표기 기반 추정)", "Original language (script estimate)"),
  englishLanguage: both("영어", "English"),
  koreanLanguage: both("한국어", "Korean"),
  unknownLanguage: both("확인되지 않음", "Undetermined"),
  details: both("상세 증거·보고서 열기", "Open detailed evidence and report"),
  fullComparison: both("전체 비교 열기", "Open full comparison"),
  applications: both("다른 서비스에 적용해 보기", "Apply to other services"),
  applicationsHelp: both("아래는 공개 기능을 바탕으로 한 가정과 후보입니다. 쉬었음.com의 실제 내부 구조를 뜻하지 않습니다.", "These are hypothetical candidates based on public features. They do not describe the internal architecture of 쉬었음.com."),
  appCache: both("스터디·커뮤니티 목록이 많이 반복 조회된다면 캐시 후보입니다. 먼저 DB 조회 p95와 반복률을 측정하고, 낮은 트래픽이면 직접 조회를 유지하세요.", "Frequently read Study or Community lists could be cache candidates. Measure DB p95 and repeat rate first; keep direct reads for low traffic."),
  appAsync: both("Todo 알림이 요청 완료를 기다릴 필요가 없다면 비동기 후보입니다. 지연 허용 시간과 중복 알림 위험을 확인하고, 규모가 작으면 동기 작업이 단순합니다.", "Todo notifications could be asynchronous if the request need not wait. Check acceptable delay and duplicate risk; synchronous work is simpler at small scale."),
} as const;
type CopyKey = keyof typeof copy;

type FlowPart = { name: Text; role: Text; data: Text; why: Text; failure: Text };
const item = (name: Text, role: Text, data: Text, why: Text, failure: Text): FlowPart => ({ name, role, data, why, failure });
const flows = {
  catalog: [
    item(both("브라우저", "Browser"), both("상품 목록 요청", "Requests product list"), both("GET /api/catalog?category=books", "GET /api/catalog?category=books"), both("사용자의 조회가 시작되는 곳", "Starts the user's read"), both("네트워크 오류·취소", "Network error or cancellation")),
    item(both("Spring API", "Spring API"), both("입력 검증과 경로 선택", "Validates and routes"), both("category, incident ID", "category, incident ID"), both("캐시·DB 전에 잘못된 입력을 거절", "Reject invalid input before cache or DB"), both("4xx·5xx·timeout", "4xx, 5xx or timeout")),
    item(both("Redis", "Redis"), both("상품 목록 캐시 조회", "Reads catalog cache"), both("카테고리 키와 JSON", "Category key and JSON"), both("적중하면 DB 왕복을 생략", "A hit avoids a DB round trip"), both("미적중·우회·연결 실패", "Miss, bypass or connection failure")),
    item(both("MySQL", "MySQL"), both("영속 상품 목록 조회", "Reads durable catalog"), both("상품 행", "Product rows"), both("미적중이나 우회 때 원본을 읽음", "Provides source data on miss or bypass"), both("느린 조회·오류", "Slow query or error")),
    item(both("HTTP 응답", "HTTP response"), both("결과를 화면으로 반환", "Returns result to screen"), both("상품 JSON·상태 코드", "Product JSON and status"), both("요청 경계를 닫음", "Closes request boundary"), both("응답 실패·시간 초과", "Response failure or timeout")),
  ],
  order: [
    item(both("주문 API", "Order API"), both("키와 주문 검증", "Validates key and order"), both("Idempotency-Key, 상품·수량", "Idempotency-Key, product and quantity"), both("중복 요청과 입력 오류를 먼저 처리", "Handle duplicates and bad input first"), both("충돌 409·검증 오류", "Conflict 409 or validation error")),
    item(both("MySQL 주문 + outbox", "MySQL order + outbox"), both("한 트랜잭션에 두 행 저장", "Commits two rows together"), both("주문과 OrderCreated 이벤트", "Order and OrderCreated event"), both("저장 성공과 발행 의도를 함께 보존", "Preserves order and publication intent together"), both("트랜잭션 롤백", "Transaction rollback")),
    item(both("relay", "Relay"), both("outbox를 claim해 발행", "Claims and publishes outbox"), both("이벤트 ID·주문 ID·추적 문맥", "Event ID, order ID and trace context"), both("DB 커밋 이후 안전하게 재시도", "Retries after DB commit"), both("발행 실패·중복 발행", "Publication failure or duplicate")),
    item(both("Kafka", "Kafka"), both("후속 처리 대기열", "Queues follow-up work"), both("OrderCreated 이벤트", "OrderCreated event"), both("접수와 처리 속도를 분리", "Separates intake and processing pace"), both("대기량·재전송", "Lag or redelivery")),
    item(both("worker + MySQL", "Worker + MySQL"), both("이벤트 중복 확인과 처리 기록", "Deduplicates and records processing"), both("이벤트 ID·처리 행", "Event ID and processing row"), both("중복 전송에도 효과를 한 번만 적용", "Avoids duplicate business effect"), both("지연·재시도·DLQ", "Delay, retry or DLQ")),
  ],
};

function rawStored(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function rawSave(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Browser storage can be disabled. */ }
}
function reportLanguage(value: string): "ko" | "en" | "und" {
  if (/[가-힣]/.test(value)) return "ko";
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(value)) return "und";
  if (/[A-Za-z]/.test(value)) return "en";
  return "und";
}

export type LearningLabProps = {
  area?: "path" | "technology";
  onAreaChange?: (area: "path" | "technology") => void;
  onLanding?: () => void;
  view: "home" | "lesson";
  onContextChange: () => void;
  onViewChange: (view: "home" | "lesson") => void;
  overview: Overview | null;
  connectionChecked: boolean;
  sessions: IncidentSession[];
  detail: SessionDetail | null;
  selectedId: string;
  selectSession: (id: string) => void;
  busy: boolean;
  onCreateSession: (name: string, scenario: Scenario) => void;
  onFault: (id: string, enabled: boolean, parameter: number) => void;
  onCollect: (id: string, phase: "BEFORE" | "AFTER") => void;
  onAnalyze: (id: string) => void;
  onPrepare: (id: string, workload: Workload) => void;
  onNavigate: (page: "lab" | "evidence" | "comparison") => void;
};

export default function LearningLab(props: LearningLabProps) {
  const { locale } = useI18n();
  const [language, setLanguage] = useState(() => { try { return readCodeLanguage(localStorage); } catch { return "java"; } });
  const recordKey = (key: string) => language === "java" || key === "incidentlens.learning.mode" ? key : `${key}.${language}.v1`;
  const stored = (key: string, fallback: string) => rawStored(recordKey(key), fallback);
  const save = (key: string, value: string) => rawSave(recordKey(key), value);
  useEffect(() => {
    const change = () => { try { setLanguage(readCodeLanguage(localStorage)); } catch { /* Keep current language. */ } };
    window.addEventListener("incidentlens-language-change", change);
    return () => window.removeEventListener("incidentlens-language-change", change);
  }, []);
  const [reference, setReference] = useState(() => stored("incidentlens.learning.mode", "curriculum") === "reference");
  useEffect(() => {
    const home = () => setReference(false);
    window.addEventListener("incidentlens-learning-home", home);
    return () => window.removeEventListener("incidentlens-learning-home", home);
  }, []);
  function switchMode(next: boolean) {
    props.onContextChange();
    setReference(next);
    save("incidentlens.learning.mode", next ? "reference" : "curriculum");
  }
  const t = (key: CopyKey) => {
    const value = copy[key];
    return Array.isArray(value) ? "" : (value as Text)[locale];
  };
  const [lessonIndex, setLessonIndex] = useState(() => Math.max(0, lessons.findIndex((lesson) => lesson.id === stored("incidentlens.learning.lesson", "request"))));
  const [flow, setFlow] = useState<"catalog" | "order">("catalog");
  const [flowPart, setFlowPart] = useState(0);
  const [coachStage, setCoachStage] = useState<"flow" | "prediction" | "experiment">("flow");
  const [scenarioId, setScenarioId] = useState<Scenario>(() => {
    const saved = stored("incidentlens.learning.scenario", "DOWNSTREAM_LATENCY");
    return scenarios.some((candidate) => candidate.id === saved) ? saved as Scenario : "DOWNSTREAM_LATENCY";
  });
  const [prediction, setPrediction] = useState(() => stored(`incidentlens.learning.prediction.${lessons[lessonIndex].id}`, ""));
  const [scenarioPrediction, setScenarioPrediction] = useState(() => stored(`incidentlens.learning.scenario.${scenarioId}`, ""));
  const [scenarioRevealed, setScenarioRevealed] = useState(false);
  const [reflection, setReflection] = useState(() => stored("incidentlens.learning.reflection", ""));
  useEffect(() => {
    const index = Math.max(0, lessons.findIndex(lesson => lesson.id === stored("incidentlens.learning.lesson", "request")));
    setLessonIndex(index);
    setPrediction(stored(`incidentlens.learning.prediction.${lessons[index].id}`, ""));
    const scenario = stored("incidentlens.learning.scenario", "DOWNSTREAM_LATENCY");
    const selected = scenarios.find(item => item.id === scenario)?.id ?? "DOWNSTREAM_LATENCY";
    setScenarioId(selected);
    setScenarioPrediction(stored(`incidentlens.learning.scenario.${selected}`, ""));
    setReflection(stored("incidentlens.learning.reflection", ""));
  }, [language]);
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [parameter, setParameter] = useState(() => scenarios.find((candidate) => candidate.id === scenarioId)!.parameter);
  const [vus, setVus] = useState(2);
  const [duration, setDuration] = useState(10);
  const lesson = lessons[lessonIndex];
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId)!;
  const matchingSessions = props.sessions.filter((session) => session.scenario === scenarioId);
  const selectedSession = matchingSessions.find((session) => session.id === props.selectedId);
  const detail = props.detail?.session.id === selectedSession?.id ? props.detail : null;
  const active = props.overview?.activeFault?.enabled ? props.overview.activeFault : null;
  const conflict = !!active && active.sessionId !== selectedSession?.id;
  const connected = props.overview?.services.some((service) => service.name === "demo-api" && service.status.toUpperCase() === "UP") &&
    props.overview.services.some((service) => service.name === "demo-worker" && service.status.toUpperCase() === "UP") &&
    props.overview.services.some((service) => service.name === "redis" && service.status.toUpperCase() === "UP");
  const relevantExperiment = detail?.experiments[0];
  const flowParts = flows[flow];

  function selectLesson(index: number) {
    props.onContextChange();
    setLessonIndex(index);
    setPrediction(stored(`incidentlens.learning.prediction.${lessons[index].id}`, ""));
    setRevealed(false);
    setFlow(["request", "cache"].includes(lessons[index].id) ? "catalog" : "order");
    setFlowPart(0);
    if (lessons[index].scenario) chooseScenario(lessons[index].scenario);
    setCoachStage("flow");
    save("incidentlens.learning.lesson", lessons[index].id);
    setListOpen(false);
  }
  function chooseScenario(id: Scenario) {
    props.onContextChange();
    setScenarioId(id);
    save("incidentlens.learning.scenario", id);
    setCoachStage("experiment");
    setScenarioPrediction(stored(`incidentlens.learning.scenario.${id}`, ""));
    setScenarioRevealed(false);
    setParameter(scenarios.find((candidate) => candidate.id === id)!.parameter);
    const existing = props.sessions.find((session) => session.scenario === id);
    props.selectSession(existing?.id ?? "");
  }
  function start() {
    save("incidentlens.learning.started", "true");
    props.onViewChange("lesson");
  }
  const command = relevantExperiment ? `SCENARIO=${scenarioId} PARAMETER=${parameter} VUS=${relevantExperiment.workload.vus} DURATION_SECONDS=${relevantExperiment.workload.durationSeconds} bash scripts/demo-compare.sh --scenario ${scenarioId} --session-id ${relevantExperiment.sessionId} --experiment-id ${relevantExperiment.id}` :
    `SCENARIO=${scenarioId} PARAMETER=${parameter} VUS=${vus} DURATION_SECONDS=${duration} bash scripts/demo-compare.sh --scenario ${scenarioId}`;
  const chosen = flowParts[flowPart];
  const measured = (value: number | null | undefined, unit: string) => value == null ? t("missing") : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
  const originalLanguage = detail?.report ? reportLanguage(`${detail.report.summary} ${detail.report.suspectedRootCause}`) : "und";
  const observed = detail?.report ? detail.evidence.filter((evidence) => detail.report!.evidenceIds.includes(evidence.id)) : detail?.evidence.slice(-4) ?? [];

  if (!reference || props.area === "technology") return <Curriculum area={props.area} onAreaChange={props.onAreaChange} onLanding={props.onLanding} view={props.view} onViewChange={props.onViewChange} onContextChange={props.onContextChange} onReference={() => switchMode(true)} />;
  return (
    <div className="learning-root">
      <button className="learn-secondary" onClick={() => switchMode(false)}>{locale === "ko" ? "15단계 기초 과정" : "15-stage foundations"}</button>
      {props.view === "home" ? (
        <section className="learning-intro">
          <span className="learning-kicker">INCIDENTLENS / {t("module")}</span>
          <h1>{t("welcome")}</h1>
          <p>{t("intro")}</p>
          <div className="learning-intro-actions">
            <button className="learn-primary" onClick={() => { selectLesson(0); start(); }}>{t("first")}</button>
            <button className="learn-secondary" onClick={start}>{t("resume")}</button>
          </div>
          <div className="learning-roadmap">{lessons.map((entry, index) => <button key={entry.id} onClick={() => { selectLesson(index); start(); }}>{entry.title[locale]}</button>)}</div>
        </section>
      ) : (
        <div className="learning-grid">
          <article className="learning-main">
            <div className="learning-lesson-nav">
              <button className="learn-secondary" aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)}>{t("list")}</button>
              <span>{lessonIndex + 1} / {lessons.length}</span>
            </div>
            {listOpen && <nav className="learning-list" aria-label={t("choose")}>{lessons.map((entry, index) => <button key={entry.id} aria-current={lessonIndex === index ? "step" : undefined} onClick={() => selectLesson(index)}>{entry.title[locale]}</button>)}</nav>}
            <header className="learning-header"><span className="learning-kicker">{t("module")}</span><h1>{lesson.title[locale]}</h1><p>{lesson.situation[locale]}</p></header>
            <section className="learning-box"><strong>{t("goal")}</strong><p>{lesson.goal[locale]}</p></section>

            <section className="learning-section" aria-labelledby="learning-flow-title">
              <h2 id="learning-flow-title">{t("flow")}</h2><p>{t("flowHelp")}</p>
              <div className="learning-segment" role="group" aria-label={t("flow")}><button aria-pressed={flow === "catalog"} onClick={() => { setFlow("catalog"); setFlowPart(0); setCoachStage("flow"); }}>{t("catalog")}</button><button aria-pressed={flow === "order"} onClick={() => { setFlow("order"); setFlowPart(0); setCoachStage("flow"); }}>{t("order")}</button></div>
              <div className="learning-flow" aria-label={flow === "catalog" ? t("catalog") : t("order")}>
                {flowParts.map((part, index) => <div className="learning-flow-item" key={index}><button className={flowPart === index ? "selected" : ""} aria-pressed={flowPart === index} onClick={() => { setFlowPart(index); setCoachStage("flow"); }}>{part.name[locale]}</button>{index < flowParts.length - 1 && <button className="learning-edge" aria-label={`${part.name[locale]} → ${flowParts[index + 1].name[locale]}`} onClick={() => { setFlowPart(index + 1); setCoachStage("flow"); }}>→</button>}</div>)}
              </div>
              <div className="learning-branches">{flow === "catalog" ? <><button onClick={() => { setFlowPart(4); setCoachStage("flow"); }}>{t("cacheHit")}</button><button onClick={() => { setFlowPart(3); setCoachStage("flow"); }}>{t("cacheMiss")}</button></> : <button onClick={() => { setFlowPart(1); setCoachStage("flow"); }}>{t("orderResponse")}</button>}</div>
              <div className="learning-flow-detail"><h3>{chosen.name[locale]}</h3><dl><dt>{t("role")}</dt><dd>{chosen.role[locale]}</dd><dt>{t("data")}</dt><dd>{chosen.data[locale]}</dd><dt>{t("why")}</dt><dd>{chosen.why[locale]}</dd><dt>{t("failure")}</dt><dd>{chosen.failure[locale]}</dd></dl></div>
            </section>

            <section className="learning-section learning-predict"><h2>{t("predict")}</h2><p>{lesson.question[locale]}</p><label htmlFor="learning-prediction">{t("prediction")}</label><textarea id="learning-prediction" value={prediction} placeholder={t("predictionPlaceholder")} onFocus={() => setCoachStage("prediction")} onChange={(event) => { setPrediction(event.target.value); save(`incidentlens.learning.prediction.${lesson.id}`, event.target.value); }} /><button className="learn-secondary" onClick={() => { setRevealed(!revealed); setCoachStage("prediction"); }} aria-expanded={revealed}>{revealed ? t("hide") : t("reveal")}</button>{revealed && <div className="learning-box"><strong>{t("explanation")}</strong><p>{lesson.answer[locale]}</p></div>}</section>

            <section className="learning-section"><h2>{t("technical")}</h2>{lesson.topics.map((entry) => <details className="learning-topic" key={entry.code}><summary>{entry.name[locale]}</summary><dl>{entry.sections.map((section, index) => <div key={index}><dt>{copy.sections[index][locale]}</dt><dd>{section[locale]}</dd></div>)}</dl><a href={`https://github.com/NIGHTPURI/incident-lens/blob/feat/backend-learning-lab/${entry.code}`} target="_blank" rel="noreferrer">{t("code")}: {entry.code.split("/").at(-1)} ↗</a></details>)}</section>

            {(lesson.scenario || lesson.id === "diagnose") && <section className="learning-section learning-experiment" aria-labelledby="learning-experiments-title"><h2 id="learning-experiments-title">{t("experiments")}</h2><div className="learning-scenarios">{scenarios.map((entry) => <button key={entry.id} aria-pressed={scenarioId === entry.id} onClick={() => chooseScenario(entry.id)}>{entry.title[locale]}</button>)}</div>
              <div className="learning-sequence"><strong>{t("workflow")}</strong><ol>{copy.steps.map((step, index) => <li key={index}>{step[locale]}</li>)}</ol></div>
              <div className="learning-box"><strong>{t("background")}: {scenario.title[locale]}</strong><p>{scenario.change[locale]}</p><p><b>{t("observe")}:</b> {scenario.observe[locale]}</p><p>{t("scope")}</p></div>
              <div className="learning-predict"><label htmlFor="scenario-prediction">{t("experimentPrediction")}: {scenario.question[locale]}</label><textarea id="scenario-prediction" value={scenarioPrediction} placeholder={t("predictionPlaceholder")} onFocus={() => setCoachStage("experiment")} onChange={(event) => { setScenarioPrediction(event.target.value); save(`incidentlens.learning.scenario.${scenarioId}`, event.target.value); }} /><button className="learn-secondary" aria-expanded={scenarioRevealed} onClick={() => { setScenarioRevealed(!scenarioRevealed); setCoachStage("experiment"); }}>{t("scenarioReveal")}</button>{scenarioRevealed && <div className="learning-box"><p>{scenario.expected[locale]}</p></div>}</div>
              <p className="learning-service"><strong>{t("service")}: </strong>{connected ? t("connected") : props.connectionChecked ? t("offline") : t("unknown")}</p>
              <div className="learning-controls"><h3>{t("configure")}</h3>{matchingSessions.length ? <label>{t("session")}<select value={selectedSession?.id ?? ""} onChange={(event) => props.selectSession(event.target.value)}><option value="">{t("noSession")}</option>{matchingSessions.map((session) => <option key={session.id} value={session.id}>{session.name} · {session.id.slice(0, 8)}</option>)}</select></label> : <p>{t("noSession")}</p>}
                <button className="learn-secondary" disabled={!connected || props.busy} onClick={() => props.onCreateSession(`${scenario.title.en} learning`, scenarioId)}>{t("create")}</button>
                {(scenarioId === "DOWNSTREAM_LATENCY" || scenarioId === "KAFKA_SLOWDOWN") && <label>{t("parameter")}<input type="number" min="0" max="2000" step="50" value={parameter} onChange={(event) => setParameter(Number(event.target.value))} /></label>}
                {conflict && <p className="learning-warning">{t("otherFault")}</p>}
                <div className="learning-control-actions"><button className="learn-primary" disabled={!connected || !selectedSession || !!active || props.busy || !Number.isInteger(parameter) || parameter < 0 || parameter > 2000} onClick={() => props.onFault(selectedSession!.id, true, parameter)}>{t("enable")}</button><button className="learn-secondary" disabled={!active || !selectedSession || active.sessionId !== selectedSession.id || props.busy} onClick={() => props.onFault(selectedSession!.id, false, parameter)}>{t("disable")}</button></div>
                <div className="learning-control-actions"><button className="learn-secondary" disabled={!connected || !detail || !active || active.sessionId !== detail.session.id || props.busy} onClick={() => props.onCollect(detail!.session.id, "BEFORE")}>{t("before")}</button><button className="learn-secondary" disabled={!connected || !detail || !!active || props.busy} onClick={() => props.onCollect(detail!.session.id, "AFTER")}>{t("after")}</button><button className="learn-secondary" disabled={!connected || !detail || !detail.evidence.length || props.busy} onClick={() => props.onAnalyze(detail!.session.id)}>{t("rca")}</button></div>
              </div>
              <div className="learning-box"><strong>{t("command")}</strong><p>{t("commandHelp")}</p><label>{t("users")}<input type="number" min="1" max="50" value={vus} onChange={(event) => setVus(Number(event.target.value))} /></label><label>{t("duration")}<input type="number" min="5" max="300" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label><button className="learn-secondary" disabled={!connected || !detail || !!relevantExperiment || props.busy || vus < 1 || vus > 50 || duration < 5 || duration > 300} onClick={() => props.onPrepare(detail!.session.id, { vus, durationSeconds: duration })}>{t("prepare")}</button><pre className="learning-command"><code>{command}</code></pre></div>
              <div className="learning-results">{relevantExperiment && <ExecutionDetails experiment={relevantExperiment} />}<h3>{t("measured")}</h3><p>{t("conditions")}</p>{relevantExperiment?.before && relevantExperiment.after ? <div className="learning-measures"><div><strong>BEFORE</strong><span>p95: {measured(relevantExperiment.before.p95Ms, "ms")}</span><span>{t("kafkaLag")}: {measured(relevantExperiment.before.kafkaLag, t("eventsUnit"))}</span></div><div><strong>AFTER</strong><span>p95: {measured(relevantExperiment.after.p95Ms, "ms")}</span><span>{t("kafkaLag")}: {measured(relevantExperiment.after.kafkaLag, t("eventsUnit"))}</span></div></div> : <p>{t("missing")}</p>}
                <p>{t("rcaHelp")}</p><h4>{t("observations")}</h4>{observed.length ? <ul className="learning-evidence">{observed.map((evidence) => <li key={evidence.id}><strong>{evidence.type} · {evidence.phase ?? t("unknownPhase")}</strong><span>{measured(evidence.value, evidence.unit)}</span><small lang={reportLanguage(evidence.explanation)}>{evidence.explanation}</small></li>)}</ul> : <p>{t("missing")}</p>}
                {detail?.report && <div className="learning-box"><strong>{t("raw")}</strong><small>{t("originalLanguage")}: {originalLanguage === "ko" ? t("koreanLanguage") : originalLanguage === "en" ? t("englishLanguage") : t("unknownLanguage")} · {detail.report.provider}</small><p lang={originalLanguage}>{detail.report.summary}</p><h4>{t("hypothesis")}</h4><p lang={originalLanguage}>{detail.report.suspectedRootCause}</p><h4>{t("impact")}</h4><p lang={reportLanguage(detail.report.impact)}>{detail.report.impact}</p><h4>{t("citations")}</h4><p>{detail.report.evidenceIds.join(", ") || t("missing")}</p><h4>{t("further")}</h4>{detail.report.uncertainties.length ? <ul>{detail.report.uncertainties.map((uncertainty, index) => <li key={index} lang={reportLanguage(uncertainty)}>{uncertainty}</li>)}</ul> : <p>{t("noFurther")}</p>}</div>}
                <div className="learning-control-actions"><button className="learn-secondary" onClick={() => props.onNavigate("evidence")}>{t("details")}</button><button className="learn-secondary" onClick={() => props.onNavigate("comparison")}>{t("fullComparison")}</button></div>
              </div>
              <label className="learning-reflection">{t("reflect")}<textarea aria-label={t("notes")} value={reflection} onChange={(event) => { setReflection(event.target.value); save("incidentlens.learning.reflection", event.target.value); }} /></label>
            </section>}
            <section className="learning-section learning-applications"><h2>{t("applications")}</h2><p>{t("applicationsHelp")}</p><ul><li>{t("appCache")}</li><li>{t("appAsync")}</li></ul></section>
            <nav className="learning-next" aria-label={t("list")}><button className="learn-secondary" disabled={lessonIndex === 0} onClick={() => selectLesson(lessonIndex - 1)}>{t("previous")}</button><button className="learn-primary" disabled={lessonIndex === lessons.length - 1} onClick={() => selectLesson(lessonIndex + 1)}>{t("next")}</button></nav>
          </article>
          <aside className={`learning-coach ${helpOpen ? "open" : ""}`} aria-label={t("coach")}><button className="learning-help-toggle" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen}>{helpOpen ? t("hideHelp") : t("showHelp")}</button><div className="learning-coach-content"><span className="learning-kicker">{t("coach")}</span><h2>{lesson.title[locale]}</h2><p>{t("coachAbout")}</p><hr /><strong>{t("coachStage")}</strong><p>{coachStage === "flow" ? `${chosen.name[locale]} · ${chosen.role[locale]}` : coachStage === "prediction" ? lesson.question[locale] : scenario.question[locale]}</p><strong>{t("terms")}</strong><ul>{lesson.topics.map((entry) => <li key={entry.code}>{entry.name[locale]}</li>)}</ul><strong>{t("hint")}</strong><p>{coachStage === "flow" ? chosen.why[locale] : coachStage === "prediction" ? lesson.hint[locale] : scenario.observe[locale]}</p><strong>{t("compare")}</strong><p>{coachStage === "experiment" ? scenarioPrediction || t("noPrediction") : prediction || t("noPrediction")}</p>{coachStage === "prediction" && revealed && <p className="learning-coach-answer">{lesson.answer[locale]}</p>}{coachStage === "experiment" && scenarioRevealed && <p className="learning-coach-answer">{scenario.expected[locale]}</p>}</div></aside>
        </div>
      )}
    </div>
  );
}
