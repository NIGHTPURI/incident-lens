import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { chapters, roadmap } from "./curriculum";
import { readProgress, saveProgress } from "./progress";
import type { Progress } from "./progress";

type Props = { view: "home" | "lesson"; onViewChange: (view: "home" | "lesson") => void; onContextChange: () => void; onReference: () => void };
const tabs = [
  ["concept", "개념", "Concept"], ["example", "최소 예제", "Minimal example"],
  ["flow", "흐름", "Flow"], ["troubleshoot", "문제 해결", "Troubleshooting"],
  ["practice", "혼자 풀기", "Independent practice"],
] as const;
type Tab = typeof tabs[number][0];
export default function Curriculum(props: Props) {
  const { locale } = useI18n();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [progress, setProgress] = useState(() => { try { return readProgress(localStorage); } catch { return readProgress({ getItem: () => null }); } });
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState<Tab>("concept");
  const [node, setNode] = useState(0);
  const [answer, setAnswer] = useState(false);
  const [help, setHelp] = useState(false);
  const [list, setList] = useState(props.view === "home");
  const stage = roadmap.find(item => item.id === progress.stage)!;
  const chapter = chapters.find(item => item.id === stage.id);
  const index = roadmap.indexOf(stage);
  function update(next: Progress) { setProgress(next); try { setSaved(saveProgress(localStorage, next)); } catch { setSaved(false); } }
  function select(id: string) {
    props.onContextChange();
    update({ ...progress, stage: id });
    setTab("concept"); setNode(0); setAnswer(false); setList(false);
    props.onViewChange("lesson");
  }
  function switchTab(next: Tab) { props.onContextChange(); setTab(next); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, position: number) {
    const target = event.key === "ArrowRight" ? (position + 1) % tabs.length : event.key === "ArrowLeft" ? (position + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (target < 0) return;
    event.preventDefault(); switchTab(tabs[target][0]); document.getElementById(`tab-${tabs[target][0]}`)?.focus();
  }
  const roadmapView = <nav className="curriculum-roadmap" aria-label={t("15단계 과정", "15-stage curriculum")}>
    {roadmap.map(item => <button key={item.id} aria-current={item.id === stage.id ? "step" : undefined} onClick={() => select(item.id)}>
      <strong>{item.title[locale]}</strong><span>{item.status === "available" ? t("수업 제공", "Lesson available") : t("계획 · 수업 준비 중", "Planned · lesson pending")}{progress.read.includes(item.id) ? t(" · 읽음", " · Read") : ""}</span>
    </button>)}
  </nav>;
  return <div className="learning-root curriculum">
    <div className="curriculum-toolbar learning-lesson-nav">
      <button className="learn-secondary" onClick={() => setList(!list)} aria-expanded={props.view === "home" || list}>{t("학습 목록", "Lesson list")}</button>
      <button className="learn-secondary" onClick={() => { props.onContextChange(); props.onReference(); }}>{t("기존 실험 수업·저장 기록", "Existing experiment lessons and records")}</button>
    </div>
    {!saved && <p role="status">{t("브라우저 저장에 실패했습니다. 현재 입력은 유지되지만 새로고침 전에 복사하세요.", "Browser storage failed. Current input remains here; copy it before reloading.")}</p>}
    {props.view === "home" ? <section>
      <h1>{t("백엔드 학습 목록", "Backend curriculum")}</h1>
      <p>{t("15단계 수업과 독립 과제를 제공합니다. 실제 실행 예제와 설명용 모형의 범위를 각 수업에서 확인하세요. 읽기 완료는 독립 숙련이나 취업 준비 완료가 아닙니다.", "All 15 stages provide lessons and independent work. Each lesson states which examples execute and which model behavior. Reading completion is not independent mastery or job readiness.")}</p>
      <div className="learning-intro-actions"><button className="learn-primary" onClick={() => select("tools")}>{t("첫 학습 시작", "Start first lesson")}</button><button className="learn-secondary" onClick={() => select(stage.id)}>{t("이어서 학습", "Continue learning")}</button></div>
      {roadmapView}
    </section> : <>
      {list && roadmapView}
      <div className="learning-grid">
        <article className="learning-main">
          <header className="learning-header"><span>{index + 1} / {roadmap.length}</span><h1>{stage.title[locale]}</h1><p>{stage.summary[locale]}</p></header>
          {chapter?.scope && <p className="learning-box" data-testid="chapter-scope"><strong>{t("실행·검증 범위: ", "Execution and verification scope: ")}</strong>{chapter.scope[locale]}</p>}
          {!chapter ? <section className="learning-box"><h2>{t("계획 단계 · 아직 수업 없음", "Planned stage · lesson not yet available")}</h2><p>{t("이 항목은 완성된 강의나 숙련 기록으로 표시하지 않습니다. 이전 실험 수업은 참고 자료로 열 수 있지만 이 단계의 선수 지식과 독립 과제를 대신하지 않습니다.", "This item does not count as a completed lesson or mastery. Existing experiment lessons remain available as references, but do not replace this stage’s prerequisites and independent exercises.")}</p><button className="learn-secondary" onClick={() => select("tools")}>{t("기초부터 시작", "Start with foundations")}</button></section> : <>
            <div className="curriculum-tabs" role="tablist" aria-label={t("수업 내부 탭", "Lesson sections")}>
              {tabs.map(([id, ko, en], position) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="curriculum-panel" tabIndex={tab === id ? 0 : -1} onKeyDown={event => keyboard(event, position)} onClick={() => switchTab(id)}>{t(ko, en)}</button>)}
            </div>
            <section id="curriculum-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
              {tab === "concept" && <>
                <h2>{t("선수 지식과 준비", "Prerequisites and preparation")}</h2><p>{chapter.prerequisites[locale]}</p>
                <h2>{t("먼저 알아둘 말", "Plain-language glossary")}</h2><p>{chapter.glossary[locale]}</p>
                {chapter.concepts.map(section => <section key={section.title.en} className="learning-box"><h2>{section.title[locale]}</h2><p>{section.body[locale]}</p></section>)}
                <h2>{t("대안과 한계", "Alternatives and tradeoffs")}</h2><p>{chapter.tradeoffs[locale]}</p>
                {chapter.sources && <><h2>{t("공식 참고 자료", "Official references")}</h2><ul>{chapter.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label[locale]} ↗</a></li>)}</ul></>}
                <label><input type="checkbox" checked={progress.read.includes(stage.id)} onChange={event => update({ ...progress, read: event.target.checked ? [...progress.read, stage.id] : progress.read.filter(id => id !== stage.id) })} />{t("읽기 완료로 기록 (숙련과 별개)", "Mark as read (separate from mastery)")}</label>
              </>}
              {tab === "example" && <>
                <p>{t("아래 코드는 자동 실행되지 않습니다. 명령은 저장소 루트의 WSL 터미널에서 실행합니다. 필요한 도구가 없거나 공간이 부족하면 설치·빌드 대신 읽기 학습을 계속하세요.", "Code below is not run automatically. Run commands in a WSL terminal at the repository root. If tools or disk space are unavailable, continue reading instead of installing or building.")}</p>
                <h2>{t("실행 명령", "Run commands")}</h2><pre><code>{chapter.run}</code></pre>
                {chapter.concepts.filter(section => section.code).map(section => <section key={section.title.en}><h2>{section.title[locale]}</h2><pre><code>{section.code}</code></pre><h3>{t("예상 출력 (실제 실행 기록 아님)", "Expected output (not a run record)")}</h3><pre>{section.output[locale]}</pre></section>)}
                {chapter.exampleFiles && <><h2>{t("전체 예제 파일", "Complete example files")}</h2><ul>{chapter.exampleFiles.map(file => <li key={file}><code>{file}</code></li>)}</ul></>}
                <h2>{t("따라 해 보기", "Guided exercise")}</h2><p>{chapter.guided[locale]}</p>
              </>}
              {tab === "flow" && <>
                <p>{t("설명용 흐름입니다. 실시간 추적이 아닙니다. 단계를 선택해 이동하는 값과 실패 지점을 확인하세요.", "This is an explanatory flow, not a live trace. Select a step to inspect values and failure boundaries.")}</p>
                <div className="curriculum-flow">{chapter.flow.map((part, i) => <button className="learn-secondary" key={part.title.en} aria-pressed={node === i} onClick={() => setNode(i)}>{i + 1}. {part.title[locale]}{i < chapter.flow.length - 1 ? " →" : ""}</button>)}</div>
                <div className="learning-box" aria-live="polite"><h2>{chapter.flow[node].title[locale]}</h2><p>{chapter.flow[node].body[locale]}</p></div>
                <h2>{t("먼저 예측하기", "Predict first")}</h2><p>{chapter.prediction[locale]}</p>
                <label htmlFor="curriculum-prediction">{t("내 예측", "My prediction")}</label><textarea id="curriculum-prediction" value={progress.notes[stage.id] ?? ""} onChange={event => update({ ...progress, notes: { ...progress.notes, [stage.id]: event.target.value } })} />
                <button className="learn-secondary" aria-expanded={answer} onClick={() => setAnswer(!answer)}>{t("해설 보기/접기", "Show/hide explanation")}</button>{answer && <p>{chapter.answer[locale]}</p>}
              </>}
              {tab === "troubleshoot" && <><h2>{t("의도적 실패와 진단 순서", "Deliberate failure and diagnosis")}</h2><p>{chapter.failure[locale]}</p><p>{t("실제 입력, 예상 결과, 실제 결과, 확인한 원인, 바꾼 한 가지, 재검증 결과를 기록하세요. 실행하지 않았다면 실행하지 않았다고 적습니다.", "Record input, expected result, actual result, checked cause, one change and verification. If you did not run it, say so.")}</p></>}
              {tab === "practice" && <>
                <h2>{t("혼자 풀기", "Independent practice")}</h2><p>{chapter.exercise[locale]}</p>
                <details><summary>{t("힌트", "Hint")}</summary><p>{chapter.hint[locale]}</p></details>
                <details><summary>{t("풀이와 비교", "Compare with the explanation")}</summary><p>{chapter.solution[locale]}</p></details>
                <h2>{t("확인 가능한 통과 기준", "Observable pass criteria")}</h2><p>{chapter.criteria[locale]}</p>
                <label htmlFor="practice-evidence">{t("내 실행·검증 기록", "My execution and verification record")}</label><textarea id="practice-evidence" value={progress.evidence[stage.id] ?? ""} onChange={event => update({ ...progress, evidence: { ...progress.evidence, [stage.id]: event.target.value } })} />
                <p>{t("이 기록은 자기 보고이며 자동 채점이나 숙련 인증이 아닙니다. 독립 수행과 검토 결과를 구분해 적으세요. 다음 버튼은 완료 점수를 올리지 않습니다.", "This is a self-report, not automatic grading or certification. Distinguish independent work from review results. Next does not increase a completion score.")}</p>
              </>}
            </section>
          </>}
          <nav className="learning-next" aria-label={t("단계 이동", "Stage navigation")}><button className="learn-secondary" disabled={index === 0} onClick={() => select(roadmap[index - 1].id)}>{t("이전 학습", "Previous lesson")}</button><button className="learn-primary" disabled={index === roadmap.length - 1} onClick={() => select(roadmap[index + 1].id)}>{t("다음 학습", "Next lesson")}</button></nav>
        </article>
        <aside className={`learning-coach ${help ? "open" : ""}`} aria-label={t("학습 도움", "Learning help")}><button className="learning-help-toggle" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? t("학습 도움 닫기", "Close learning help") : t("학습 도움 열기", "Open learning help")}</button><div className="learning-coach-content"><h2>{t("지금의 목표", "Current goal")}</h2><p>{chapter?.criteria[locale] ?? stage.summary[locale]}</p><hr /><p>{t("작성된 학습 안내입니다. AI 대화가 아닙니다.", "Written learning guidance. This is not an AI chat.")}</p><p>{chapter?.hint[locale]}</p><strong>{t("읽기와 독립 수행은 별개입니다.", "Reading and independent performance are separate.")}</strong></div></aside>
      </div>
    </>}
  </div>;
}
