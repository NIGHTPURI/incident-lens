import { useState } from "react";
import type { Text } from "./content";
import { useI18n } from "../i18n/I18nProvider";

const t = (ko: string, en: string): Text => ({ ko, en });
export const checks = {
  tools: { question: t("파일을 읽은 뒤 터미널을 닫으면 원본 파일은 어떻게 될까요?", "What happens to the original file when you close the terminal after reading it?"), options: [t("파일이 삭제됩니다", "The file is deleted"), t("파일은 그대로 남습니다", "The file remains")], correct: 1, explanation: t("파일 읽기는 저장된 내용을 바꾸지 않습니다. 셸 프로세스의 종료와 파일 삭제는 별개입니다.", "Reading a file does not change its stored contents. Ending a shell process is separate from deleting a file.") },
  java: { question: t("정수 가격 1200 × 수량 2의 합계는?", "What is the total for integer price 1200 × quantity 2?"), options: [t("2400", "2400"), t("12002", "12002")], correct: 0, explanation: t("정수의 * 연산은 곱셈입니다. 문자열을 이어 붙이는 연산과 구분하세요.", "The * operator multiplies integers. Distinguish multiplication from joining strings.") },
  http: { question: t("이 장난감 서버에 quantity=two를 보내면 어떤 상태인가요?", "What status does this toy server return for quantity=two?"), options: [t("400 · 잘못된 입력", "400 · Invalid input"), t("500 · 서버 내부 오류", "500 · Internal server error")], correct: 0, explanation: t("이 예제는 변환 불가능한 수량을 검증하고 HTTP 400으로 응답합니다. 이는 서버 실행 실패와 다릅니다.", "This example validates the malformed quantity and returns HTTP 400. It differs from a server-launch failure.") },
  spring: { question: t("예제에서 HTTP 요청을 계산 Service에 연결하는 역할은?", "Which role connects an HTTP request to the calculation Service in this example?"), options: [t("Controller", "Controller"), t("데이터베이스 인덱스", "A database index")], correct: 0, explanation: t("Controller가 HTTP 입력·응답을 다루고 Service가 계산 규칙을 담당합니다.", "The Controller handles HTTP input/output; the Service owns the calculation rules.") },
  persistence: { question: t("존재하지 않는 카테고리 ID 참조를 막는 DB 제약은?", "Which database constraint prevents a reference to a nonexistent category ID?"), options: [t("외래 키", "Foreign key"), t("행 정렬", "Row sorting")], correct: 0, explanation: t("외래 키는 참조 관계의 무결성을 검사합니다. ORDER BY는 결과 순서를 정할 뿐입니다.", "A foreign key enforces referential integrity. ORDER BY only determines result order.") },
  transactions: { question: t("트랜잭션의 변경을 롤백하면 커밋되지 않은 재고 변경은?", "What happens to an uncommitted stock change when its transaction rolls back?"), options: [t("취소됩니다", "It is undone"), t("항상 유지됩니다", "It always remains")], correct: 0, explanation: t("롤백은 해당 트랜잭션의 DB 변경을 취소합니다. 외부 메시지나 HTTP 호출이 자동 취소된다는 뜻은 아닙니다.", "Rollback undoes database changes in that transaction. It does not automatically undo external messages or HTTP calls.") },
  security: { question: t("CORS 설정만으로 사용자 인증을 대신할 수 있나요?", "Can CORS configuration alone replace user authentication?"), options: [t("네", "Yes"), t("아니요", "No")], correct: 1, explanation: t("CORS는 브라우저의 출처 접근 정책입니다. 요청자의 신원과 자원 권한은 별도로 확인해야 합니다.", "CORS controls browser origin access. Caller identity and resource authorization require separate checks.") },
  testing: { question: t("허용 수량이 1–10일 때 경계 검사를 위한 입력 묶음은?", "For allowed quantities 1–10, which set checks the boundaries?"), options: [t("0, 1, 10, 11", "0, 1, 10, 11"), t("5만 반복", "Only repeated 5s")], correct: 0, explanation: t("범위의 양 끝과 바로 바깥을 함께 검사하면 경계 오류를 드러낼 수 있습니다.", "Testing both endpoints and values just outside them can expose boundary errors.") },
  collaboration: { question: t("필드 이름을 반드시 사용하는 클라이언트에 더 위험한 응답 변경은?", "Which response change is riskier for a client that requires a field name?"), options: [t("기존 필드 이름 변경", "Renaming the required field"), t("무시 가능한 선택 필드 추가", "Adding an ignorable optional field")], correct: 0, explanation: t("이름 변경은 기존 계약을 깨뜨릴 수 있습니다. 선택 필드 추가도 실제 클라이언트의 파싱 정책을 검증해야 합니다.", "Renaming can break the existing contract. Optional additions still need verification against the client's parsing policy.") },
  operations: { question: t("프로세스는 살아 있지만 readiness가 실패한 새 버전에 트래픽을 보내야 하나요?", "Should a new version receive traffic when its process is alive but readiness fails?"), options: [t("아니요", "No"), t("네, 프로세스가 살아 있으니까요", "Yes, because the process is alive")], correct: 0, explanation: t("프로세스 생존과 트래픽을 받을 준비는 다릅니다. 이 수업의 배포 모형은 준비되지 않은 버전으로 보내지 않습니다.", "Being alive differs from being ready to serve traffic. This lesson's deployment model does not route to an unready version.") },
  observability: { question: t("가상 로그에서 DB 시간이 큰 것만으로 DB가 지연 원인임이 입증되나요?", "Does a large DB duration in a synthetic log prove the DB caused the latency?"), options: [t("아니요, 검증할 가설입니다", "No, it is a hypothesis to test"), t("네, 인과관계가 입증됩니다", "Yes, causation is proven")], correct: 0, explanation: t("관측은 가설을 만드는 근거입니다. 실제 부하와 개입·재검증 없이 원인을 확정하지 않습니다.", "Observations support a hypothesis. Without a real workload, intervention and verification, they do not establish causation.") },
  performance: { question: t("이 수업의 TTL 캐시 모형에서 값이 만료됐다면?", "When a value expires in this lesson's TTL cache model, what happens?"), options: [t("원본 저장소에서 다시 읽습니다", "It is loaded again from the backing store"), t("만료된 값을 영구 사용합니다", "The expired value is used forever")], correct: 0, explanation: t("이 모형은 만료된 값을 캐시 미스로 다룹니다. 실제 Redis 장애·분산 동작을 검증한 것은 아닙니다.", "This model treats an expired value as a cache miss. It does not verify real Redis failures or distributed behavior.") },
  concurrency: { question: t("여러 스레드의 분리된 읽기→수정→쓰기는 안전한 원자 연산인가요?", "Is a split read→modify→write across threads a safe atomic operation?"), options: [t("아니요, 갱신을 잃을 수 있습니다", "No, updates can be lost"), t("네, 언제나 안전합니다", "Yes, it is always safe")], correct: 0, explanation: t("각 단계 사이에 다른 스레드가 끼어들 수 있습니다. 예제는 원자 증가와 버전 검사의 효과를 별도로 검사합니다.", "Other threads can interleave between steps. The example separately checks atomic increments and version checks.") },
  messaging: { question: t("메시지가 재전달되어도 주문 효과를 한 번만 적용하려면?", "How can an order effect be applied only once despite message redelivery?"), options: [t("처리 ID와 효과를 같은 트랜잭션에서 확인·기록합니다", "Check/record the processing ID and effect in the same transaction"), t("중복이 절대 없다고 가정합니다", "Assume duplicates never occur")], correct: 0, explanation: t("예제는 중복 처리 기록과 효과를 함께 커밋합니다. Kafka 전체에서 exactly-once를 보장했다는 뜻은 아닙니다.", "The example commits the deduplication record with the effect. It does not establish exactly-once guarantees across Kafka.") },
  capstone: { question: t("실행 증거에 없는 성공을 보고서가 주장하면 어떻게 해야 하나요?", "What should happen when a report claims a success absent from execution evidence?"), options: [t("검증에서 거부하거나 미검증으로 표시합니다", "Reject it or label it unverified"), t("그대로 성공으로 인정합니다", "Accept it as a success")], correct: 0, explanation: t("보고서의 주장은 확인 가능한 증거 범위를 따라야 합니다. 이 문제 통과는 코드 실행이나 프로젝트 숙련 인증이 아닙니다.", "Report claims must stay within verifiable evidence. Passing this question is not code execution or project certification.") },
} satisfies Record<string, { question: Text; options: Text[]; correct: number; explanation: Text }>;
type CheckId = keyof typeof checks;
const key = "incidentlens.curriculum.checks.v1";
type Answers = Partial<Record<CheckId, { choice: number; submitted: boolean }>>;
function readAnswers(storageKey: string): Answers {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter(([id, raw]) => {
      const answer = raw as Answers[CheckId];
      return Object.hasOwn(checks, id) && answer && Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < checks[id as CheckId].options.length && typeof answer.submitted === "boolean";
    }));
  } catch { return {}; }
}
export default function KnowledgeCheck({ stage, language = "java" }: { stage: string; language?: string }) {
  const storageKey = language === "java" ? key : `incidentlens.curriculum.checks.${language}.v1`;
  const { locale } = useI18n();
  const [answers, setAnswers] = useState(() => readAnswers(storageKey));
  const [saved, setSaved] = useState(true);
  const id = stage as CheckId;
  const check = language !== "java" && id === "spring" ? {
    question: t("HTTP 입력 처리와 업무 규칙을 나누는 이유는?", "Why separate HTTP input handling from business rules?"),
    options: [t("입력 검증과 업무 로직을 각각 검사하기 위해", "To check validation and business rules separately"), t("DB 트랜잭션을 없애기 위해", "To remove DB transactions")], correct: 0,
    explanation: t("Python 핸들러, Node.js 라우트, ASP.NET Core 엔드포인트의 입력 경계와 서비스 규칙은 별도로 검사합니다.", "Check the input boundary of Python handlers, Node.js routes and ASP.NET Core endpoints separately from service rules."),
  } : checks[id];
  if (!check) return null;
  const answer = answers[id];
  const correct = answer?.choice === check.correct;
  function update(choice: number, submitted: boolean) {
    const next = { ...answers, [id]: { choice, submitted } }; setAnswers(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(true); } catch { setSaved(false); }
  }
  return <section className="knowledge-check" aria-labelledby={`check-heading-${id}`}>
    <h2 id={`check-heading-${id}`}>{t("짧은 개념 확인", "Quick concept check")[locale]}</h2>
    <fieldset><legend>{check.question[locale]}</legend>
      {check.options.map((option, i) => <label className="learning-choice" key={i}>
        <input type="radio" name={`check-${id}`} checked={answer?.choice === i} onChange={() => update(i, false)} />
        <span>{option[locale]}</span>
      </label>)}
    </fieldset>
    <button className="learn-secondary" disabled={!answer} onClick={() => answer && update(answer.choice, true)}>{t("답 확인", "Check answer")[locale]}</button>
    <div className={`check-feedback ${answer?.submitted ? correct ? "correct" : "retry" : ""}`} role="status" aria-live="polite" aria-atomic="true">
      {answer?.submitted ? <><strong>{correct ? t("맞았습니다. 이유도 확인해 보세요.", "Correct. Review the reason too.")[locale] : t("다시 생각해 보세요. 선택을 바꿔 재확인할 수 있습니다.", "Try again. You can change your choice and recheck.")[locale]}</strong><p>{check.explanation[locale]}</p></> : <p>{t("답을 고른 뒤 확인하세요. 개념 문제만 확인하며 코드 실행·숙련을 채점하지 않습니다.", "Choose an answer, then check it. This checks a concept, not code execution or mastery.")[locale]}</p>}
    </div>
    {!saved && <p role="status">{t("답을 브라우저에 저장하지 못했습니다. 현재 선택은 유지됩니다.", "The answer could not be saved in this browser. Your current choice remains.")[locale]}</p>}
  </section>;
}
