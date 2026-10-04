import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { chapters, roadmap } from "./curriculum";
import { chapterForPlatform, platformIntro, platformPreparation, readPlatform, savePlatform, shellReference, verificationCommands, verificationDescription, type LearningPlatform } from "./platform";
import { readProgress, saveProgress } from "./progress";
import type { Progress } from "./progress";
import KnowledgeCheck from "./KnowledgeCheck";
import LessonText from "./LessonText";
import ProgrammingGuide, { CODE_LANGUAGE_KEY, codeLanguages, guideSections, readCodeLanguage, type CodeLanguage } from "./programming-tracks";
import { TechnologyGuide, technologyGuides, technologyGroups, technologySections } from "./technology-guides";

type Props = { view: "home" | "lesson"; onViewChange: (view: "home" | "lesson") => void; onContextChange: () => void; onReference: () => void };
const tabs = [
  ["concept", "개념", "Concept"], ["example", "최소 예제", "Minimal example"],
  ["flow", "흐름", "Flow"], ["troubleshoot", "문제 해결", "Troubleshooting"],
  ["practice", "혼자 풀기", "Independent practice"],
] as const;
type Tab = typeof tabs[number][0];
const modules = [
  { id: "start", ko: "시작과 요청", en: "Getting started & requests", lessons: ["tools", "java", "http"] },
  { id: "data", ko: "API와 데이터", en: "APIs & data", lessons: ["spring", "persistence", "transactions"] },
  { id: "quality", ko: "안전한 개발", en: "Reliable development", lessons: ["security", "testing", "collaboration", "operations"] },
  { id: "systems", ko: "운영과 분산 시스템", en: "Operations & distributed systems", lessons: ["observability", "performance", "concurrency", "messaging"] },
  { id: "project", ko: "독립 프로젝트", en: "Independent project", lessons: ["capstone"] },
] as const;
export default function Curriculum(props: Props) {
  const { locale } = useI18n();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [progress, setProgress] = useState(() => { try { return readProgress(localStorage); } catch { return readProgress({ getItem: () => null }); } });
  const [platform, setPlatform] = useState<LearningPlatform>(() => { try { return readPlatform(localStorage, navigator.platform); } catch { return "linux"; } });
  const [platformSaved, setPlatformSaved] = useState(true);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>(() => { try { return readCodeLanguage(localStorage); } catch { return "java"; } });
  const [codeLanguageSaved, setCodeLanguageSaved] = useState(true);
  const [guideSection, setGuideSection] = useState<(typeof guideSections)[number]["id"]>("orient");
  const [learningArea, setLearningArea] = useState<"path" | "technology">("path");
  const [technologyId, setTechnologyId] = useState("redis");
  const [technologySection, setTechnologySection] = useState<(typeof technologySections)[number]["id"]>("need");
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState<Tab>("concept");
  const [node, setNode] = useState(0);
  const [answer, setAnswer] = useState(false);
  const [help, setHelp] = useState(false);
  const [readFeedback, setReadFeedback] = useState<"added" | "removed" | null>(null);
  const [practiceChecked, setPracticeChecked] = useState(() => Boolean(progress.evidence[progress.stage]?.trim()) && progress.reviewed[progress.stage] === progress.evidence[progress.stage]);
  const [practiceFeedback, setPracticeFeedback] = useState(false);
  const [list, setList] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(modules.map(module => module.id));
  const [activeTopic, setActiveTopic] = useState<number | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const currentLesson = useRef<HTMLButtonElement>(null);
  const currentGuide = useRef<HTMLButtonElement>(null);
  const currentTechnology = useRef<HTMLButtonElement>(null);
  const stage = roadmap.find(item => item.id === progress.stage)!;
  const originalChapter = chapters.find(item => item.id === stage.id);
  const chapter = originalChapter && chapterForPlatform(originalChapter, platform);
  const preparation = platformPreparation(platform, stage.id);
  useEffect(() => {
    (learningArea === "technology" ? currentTechnology : codeLanguage === "java" ? currentLesson : currentGuide).current?.scrollIntoView?.({ block: "nearest" });
  }, [progress.stage, list, codeLanguage, guideSection, learningArea, technologyId]);
  useEffect(() => {
    if (!list) return;
    const media = window.matchMedia?.("(max-width: 820px)");
    if (!media?.matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setList(false); menuButton.current?.focus(); return; }
      if (event.key !== "Tab") return;
      const controls = [...(sidebar.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    const resize = () => { if (!media.matches) setList(false); };
    document.addEventListener("keydown", keydown);
    media.addEventListener("change", resize);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); media.removeEventListener("change", resize); };
  }, [list]);
  function closeMenu() { setList(false); requestAnimationFrame(() => menuButton.current?.focus()); }
  function goToTopic(position: number) {
    props.onContextChange(); setTab("concept"); setActiveTopic(position); setList(false);
    requestAnimationFrame(() => {
      const heading = document.getElementById(`concept-${stage.id}-${position}`);
      heading?.focus(); heading?.scrollIntoView?.({ block: "start" });
    });
  }
  function chooseCodeLanguage(next: CodeLanguage) {
    props.onContextChange(); setCodeLanguage(next); setGuideSection("orient"); setLearningArea("path"); setList(false);
    try { localStorage.setItem(CODE_LANGUAGE_KEY, next); setCodeLanguageSaved(true); }
    catch { setCodeLanguageSaved(false); }
  }
  function goToGuideSection(id: (typeof guideSections)[number]["id"]) {
    props.onContextChange(); setGuideSection(id); setList(false);
    requestAnimationFrame(() => {
      const heading = document.getElementById(`track-${id}`);
      heading?.focus(); heading?.scrollIntoView?.({ block: "start" });
    });
  }
  function openTechnology(id: string) {
    props.onContextChange(); setTechnologyId(id); setTechnologySection("need"); setLearningArea("technology"); setList(false); window.scrollTo({ top: 0 });
  }
  function openTechnologySection(id: (typeof technologySections)[number]["id"]) {
    setTechnologySection(id); setList(false);
    requestAnimationFrame(() => { const heading = document.getElementById(`tech-${id}`); heading?.focus(); heading?.scrollIntoView?.({ block: "start" }); });
  }
  function openRelatedStage(id: string) {
    chooseCodeLanguage("java"); select(id); window.scrollTo({ top: 0 });
  }
  function choosePlatform(next: LearningPlatform) {
    props.onContextChange(); setPlatform(next);
    try { setPlatformSaved(savePlatform(localStorage, next)); } catch { setPlatformSaved(false); }
  }
  const index = roadmap.indexOf(stage);
  function update(next: Progress): boolean {
    setProgress(next);
    try { const stored = saveProgress(localStorage, next); setSaved(stored); return stored; } catch { setSaved(false); return false; }
  }
  function recordRead(checked: boolean) {
    const stored = update({ ...progress, read: checked ? [...new Set([...progress.read, stage.id])] : progress.read.filter(id => id !== stage.id) });
    setReadFeedback(stored ? checked ? "added" : "removed" : null);
  }
  function savePractice() {
    const evidence = progress.evidence[stage.id] ?? "";
    if (!practiceChecked || !evidence.trim()) return;
    setPracticeFeedback(update({ ...progress, reviewed: { ...progress.reviewed, [stage.id]: evidence } }));
  }
  function select(id: string) {
    props.onContextChange();
    update({ ...progress, stage: id });
    const wasMenuOpen = list;
    setTab("concept"); setNode(0); setAnswer(false); setList(false); setActiveTopic(null); setReadFeedback(null); setPracticeFeedback(false);
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(".curriculum .learning-header h1");
      if (wasMenuOpen) heading?.focus();
      heading?.scrollIntoView?.({ block: "start" });
    });
    setPracticeChecked(Boolean(progress.evidence[id]?.trim()) && progress.reviewed[id] === progress.evidence[id]);
    props.onViewChange("lesson");
  }
  function switchTab(next: Tab) { props.onContextChange(); setTab(next); setActiveTopic(null); }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, position: number) {
    const target = event.key === "ArrowRight" ? (position + 1) % tabs.length : event.key === "ArrowLeft" ? (position + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (target < 0) return;
    event.preventDefault(); switchTab(tabs[target][0]); document.getElementById(`tab-${tabs[target][0]}`)?.focus();
  }
  const contents = learningArea === "technology" ? <nav className="curriculum-tree curriculum-tech-tree" aria-label={t("기술 사전 목차", "Technology guide contents")}>
    {technologyGroups.map(group => <section className="curriculum-tree-group" key={group.id}>
      <span className="curriculum-guide-title">{t(group.ko, group.en)}</span>
      {technologyGuides.filter(item => item.group === group.id).map(item => <div key={item.id}>
        <button ref={technologyId === item.id ? currentTechnology : undefined} className="curriculum-lesson-link" aria-current={technologyId === item.id ? "step" : undefined} onClick={() => openTechnology(item.id)}>{item.name}<small>{item.mode === "optional" ? t("선택", "Optional") : t("기본", "Core")}</small></button>
        {technologyId === item.id && <div className="curriculum-tree-topics">{technologySections.map(section => <button key={section.id} className="curriculum-topic-link" aria-current={technologySection === section.id ? "location" : undefined} onClick={() => openTechnologySection(section.id)}>{t(section.ko, section.en)}</button>)}</div>}
      </div>)}
    </section>)}
  </nav> : codeLanguage === "java" ? <nav className="curriculum-tree" aria-label={t("15단계 수업 목차", "15-stage lesson contents")}>
    {modules.map(module => <section className="curriculum-tree-group" key={module.id}>
      <button className="curriculum-group-toggle" aria-expanded={expandedGroups.includes(module.id)} aria-controls={`lesson-group-${module.id}`} onClick={() => setExpandedGroups(current => current.includes(module.id) ? current.filter(id => id !== module.id) : [...current, module.id])}>
        <span aria-hidden="true" className="curriculum-chevron">{expandedGroups.includes(module.id) ? "▾" : "▸"}</span>
        <span>{t(module.ko, module.en)}</span>
      </button>
      <div id={`lesson-group-${module.id}`} hidden={!expandedGroups.includes(module.id)}>
        {module.lessons.map(id => {
          const item = roadmap.find(candidate => candidate.id === id)!;
          const isCurrent = id === stage.id;
          const read = progress.read.includes(id);
          const evidence = progress.evidence[id]?.trim();
          const reviewed = evidence && progress.reviewed[id] === progress.evidence[id];
          return <div className="curriculum-tree-lesson" key={id}>
            <button ref={isCurrent ? currentLesson : undefined} className="curriculum-lesson-link" aria-current={isCurrent && props.view === "lesson" ? "step" : undefined} onClick={() => select(id)}>
              <span className="curriculum-lesson-title">{item.title[locale]}</span>
              {(read || reviewed || evidence) && <span className="curriculum-lesson-mark">{reviewed ? t("자기확인 기록", "Self-review saved") : evidence ? t("실습 기록", "Practice note") : t("읽기 기록", "Marked read")}</span>}
            </button>
            {isCurrent && props.view === "lesson" && chapter && <div className="curriculum-tree-topics">
              {chapter.concepts.map((section, position) => <button key={section.title.en} className="curriculum-topic-link" aria-current={tab === "concept" && activeTopic === position ? "location" : undefined} onClick={() => goToTopic(position)}>{section.title[locale]}</button>)}
            </div>}
          </div>;
        })}
      </div>
    </section>)}
  </nav> : <nav className="curriculum-tree curriculum-guide-tree" aria-label={t("언어 시작 안내 목차", "Language starter guide contents")}>
    <span className="curriculum-guide-title">{codeLanguages.find(item => item.id === codeLanguage)!.name} · {t("언어별 학습", "Language path")}</span>
    {guideSections.map(section => <button key={section.id} ref={guideSection === section.id ? currentGuide : undefined} className="curriculum-topic-link" aria-current={guideSection === section.id ? "location" : undefined} onClick={() => goToGuideSection(section.id)}>{t(section.ko, section.en)}</button>)}
  </nav>;
  return <div className="learning-root curriculum curriculum-shell">
    {list && <div className="curriculum-backdrop" onClick={closeMenu} aria-hidden="true" />}
    <aside id="learning-sidebar" ref={sidebar} className={`curriculum-sidebar ${list ? "open" : ""}`} aria-label={t("백엔드 학습실 목차", "Backend Learning contents")} role={list ? "dialog" : undefined} aria-modal={list ? true : undefined}>
      <div className="curriculum-sidebar-header">
        <button className="curriculum-brand" onClick={() => { props.onContextChange(); props.onViewChange("home"); setList(false); }}><span className="brand-mark" aria-hidden="true">iL</span><span>IncidentLens<strong>{t("백엔드 학습실", "Backend Learning")}</strong></span></button>
        <button ref={closeButton} className="curriculum-menu-close" onClick={closeMenu} aria-label={t("학습 목록 닫기", "Close lesson list")}>×</button>
      </div>
      <div className="curriculum-area-switch" role="group" aria-label={t("학습 목차 종류", "Learning contents type")}><button aria-pressed={learningArea === "path"} onClick={() => setLearningArea("path")}>{t("언어별 학습", "Language paths")}</button><button aria-pressed={learningArea === "technology"} onClick={() => setLearningArea("technology")}>{t("기술 사전", "Technology guides")}</button></div>
      {learningArea === "technology" ? <div className="curriculum-sidebar-progress"><span>{t("읽기 안내 · 완료 기록 없음", "Reading guide · no completion record")}</span></div> : codeLanguage === "java" ? <div className="curriculum-sidebar-progress"><span>{t("읽기 기록 · 자기 표시", "Reading record · self-marked")} {progress.read.length} / {roadmap.length}</span><progress value={progress.read.length} max={roadmap.length} aria-label={t("읽기 기록 · 숙련 점수 아님", "Reading record · not a mastery score")} /></div> : <div className="curriculum-sidebar-progress"><span>{t("언어별 학습 · 완료 기록 없음", "Language path · no completion record")}</span></div>}
      {contents}
      <p className="curriculum-sidebar-note">{learningArea === "technology" ? t("실험실의 실제 구성과 설명용 예시를 구분하세요.", "Distinguish actual lab configuration from illustrative examples.") : codeLanguage === "java" ? t("읽기·실습 표시는 자기 기록이며 숙련 인증이 아닙니다.", "Reading and practice marks are self-records, not mastery certification.") : t("이 언어는 API부터 배포까지 설명하지만 실행·완료 기록은 없습니다. Java 수업 진도와 별개입니다.", "This language explains API through deployment without a run or completion record. It is separate from Java course progress.")}</p>
    </aside>
    <div className="curriculum-content">
    <div className="curriculum-mobile-current"><button ref={menuButton} className="learn-secondary curriculum-menu-toggle" aria-expanded={list} aria-controls="learning-sidebar" onClick={() => setList(true)}>{t("☰ 수업 목록", "☰ Lesson list")}</button><span>{learningArea === "technology" ? technologyGuides.find(item => item.id === technologyId)!.name : codeLanguage === "java" ? stage.title[locale] : `${codeLanguages.find(item => item.id === codeLanguage)!.name} · ${t("언어별 학습", "Language path")}`}</span></div>
    {learningArea === "path" && <>
    <div className="curriculum-toolbar learning-lesson-nav">
      <button className="learn-secondary" onClick={() => { props.onContextChange(); props.onReference(); }}>{codeLanguage === "java" ? t("기존 실험 수업·저장 기록", "Existing experiment lessons and records") : t("기존 Java 실험 수업·저장 기록", "Existing Java experiment lessons and records")}</button>
      <label className="curriculum-language" htmlFor="learning-code-language">{t("프로그래밍 언어", "Programming language")}
        <select id="learning-code-language" value={codeLanguage} onChange={event => chooseCodeLanguage(event.target.value as CodeLanguage)} aria-describedby="learning-code-language-description">
          {codeLanguages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="curriculum-platform" htmlFor="learning-platform">{t("학습 OS / 셸", "Learning OS / shell")}
        <select id="learning-platform" value={platform} onChange={event => choosePlatform(event.target.value as LearningPlatform)} aria-describedby="learning-platform-description">
          <option value="windows">Windows (PowerShell)</option><option value="linux">Linux (Bash · WSL)</option>
        </select>
      </label>
    </div>
    <p id="learning-code-language-description" className="curriculum-language-description">{t("코드 언어는 화면 언어·운영체제와 별개입니다. Java의 15단계 수업과 기존 기록은 Java에서 유지됩니다.", "Programming language is separate from UI language and OS. Java's 15-stage course and existing records stay with Java.")}</p>
    <p id="learning-platform-description">{codeLanguage === "java" ? platformIntro[platform][locale] : t("선택한 운영체제에 맞는 도구 확인 명령을 아래 안내에서 보여줍니다. 설치나 서버 실행은 자동으로 하지 않습니다.", "The guide below shows a toolchain check for the selected OS. Nothing is installed or started automatically.")}</p>
    {!codeLanguageSaved && <p role="status">{t("코드 언어 선택을 브라우저에 저장하지 못했습니다. 현재 선택은 유지됩니다.", "The programming language choice could not be saved in this browser. Your current choice remains active.")}</p>}
    {!platformSaved && <p role="status">{t("OS 선택을 브라우저에 저장하지 못했습니다. 현재 선택은 유지됩니다.", "The OS choice could not be saved in this browser. Your current choice remains active.")}</p>}
    {!saved && <p role="status">{t("브라우저 저장에 실패했습니다. 현재 입력은 유지되지만 새로고침 전에 복사하세요.", "Browser storage failed. Current input remains here; copy it before reloading.")}</p>}
    </>}
    {learningArea === "technology" ? <TechnologyGuide id={technologyId} locale={locale} onStage={openRelatedStage} /> : codeLanguage !== "java" ? <ProgrammingGuide language={codeLanguage} locale={locale} platform={platform} /> : props.view === "home" ? <section>
      <h1>{t("백엔드 학습 목록", "Backend curriculum")}</h1>
      <div className="learning-box curriculum-java-guide"><strong>{t("Java로 시작", "Starting with Java")}</strong><p>{t("Java는 JVM에서 실행하는 언어입니다. 기존 Java 21을 확인하고 파일·변수·HTTP를 배운 뒤 4단계에서 Spring Boot API를 만납니다. 이 저장소의 자유실험실도 Java/Spring 기반이며 다른 언어 트랙의 실행 결과로 표시하지 않습니다.", "Java runs on the JVM. Check for Java 21, learn files, variables and HTTP, then reach a Spring Boot API in stage 4. The free lab also uses Java/Spring; it is not presented as an execution result for another language.")}</p></div>
      <p>{t("15단계 수업과 독립 과제를 제공합니다. 실제 실행 예제와 설명용 모형의 범위를 각 수업에서 확인하세요. 읽기 완료는 독립 숙련이나 취업 준비 완료가 아닙니다.", "All 15 stages provide lessons and independent work. Each lesson states which examples execute and which model behavior. Reading completion is not independent mastery or job readiness.")}</p>
      <div className="learning-intro-actions"><button className="learn-primary" onClick={() => select("tools")}>{t("첫 학습 시작", "Start first lesson")}</button><button className="learn-secondary" onClick={() => select(stage.id)}>{t("이어서 학습", "Continue learning")}</button></div>
    </section> : <>
      <div className="learning-grid">
        <article className="learning-main">
          <header className="learning-header"><span>{index + 1} / {roadmap.length}</span><h1 tabIndex={-1}>{stage.title[locale]}</h1><p>{stage.summary[locale]}</p></header>
          {technologyGuides.filter(item => item.stage === stage.id).length > 0 && <div className="curriculum-technology-links"><strong>{t("관련 기술 자세히", "Explore related technology")}</strong>{technologyGuides.filter(item => item.stage === stage.id).map(item => <button className="learn-secondary" key={item.id} onClick={() => openTechnology(item.id)}>{item.name} ↗</button>)}</div>}
          {chapter?.scope && <p className="learning-box" data-testid="chapter-scope"><strong>{t("실행·검증 범위: ", "Execution and verification scope: ")}</strong>{chapter.scope[locale]}</p>}
          {!chapter ? <section className="learning-box"><h2>{t("계획 단계 · 아직 수업 없음", "Planned stage · lesson not yet available")}</h2><p>{t("이 항목은 완성된 강의나 숙련 기록으로 표시하지 않습니다. 이전 실험 수업은 참고 자료로 열 수 있지만 이 단계의 선수 지식과 독립 과제를 대신하지 않습니다.", "This item does not count as a completed lesson or mastery. Existing experiment lessons remain available as references, but do not replace this stage’s prerequisites and independent exercises.")}</p><button className="learn-secondary" onClick={() => select("tools")}>{t("기초부터 시작", "Start with foundations")}</button></section> : <>
            <div className="curriculum-tabs" role="tablist" aria-label={t("수업 내부 탭", "Lesson sections")}>
              {tabs.map(([id, ko, en], position) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="curriculum-panel" tabIndex={tab === id ? 0 : -1} onKeyDown={event => keyboard(event, position)} onClick={() => switchTab(id)}>{t(ko, en)}</button>)}
            </div>
            <section id="curriculum-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
              {tab === "concept" && <>
                <h2>{t("선수 지식과 준비", "Prerequisites and preparation")}</h2><LessonText text={chapter.prerequisites[locale]} />
                <h2>{t("먼저 알아둘 말", "Plain-language glossary")}</h2><LessonText text={chapter.glossary[locale]} glossary />
                {chapter.concepts.map((section, position) => <section key={section.title.en} className="learning-box"><h2 id={`concept-${stage.id}-${position}`} tabIndex={-1}>{section.title[locale]}</h2><LessonText text={section.body[locale]} /></section>)}
                <h2>{t("대안과 한계", "Alternatives and tradeoffs")}</h2><LessonText text={chapter.tradeoffs[locale]} />
                {chapter.sources && <><h2>{t("공식 참고 자료", "Official references")}</h2><ul>{chapter.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label[locale]} ↗</a></li>)}</ul></>}
                <div className="learning-read-record">
                  <label className="learning-checkbox-row"><input type="checkbox" checked={progress.read.includes(stage.id)} onChange={event => recordRead(event.target.checked)} /><span>{t("읽기 완료로 기록 (숙련과 별개)", "Mark as read (separate from mastery)")}</span></label>
                  <div className={`read-confirmation ${readFeedback === "added" ? "just-recorded" : ""}`} role="status" aria-live="polite" aria-atomic="true">
                    {readFeedback === "added" ? t("읽기 기록을 저장했습니다. 숙련 평가와는 별개입니다.", "Reading record saved. This is separate from a mastery assessment.") : readFeedback === "removed" ? t("읽기 표시를 해제했습니다. 예측과 실습 기록은 유지됩니다.", "Read mark removed. Predictions and practice records remain.") : t("읽은 뒤 직접 표시하세요. 다음 학습 버튼은 완료 점수를 올리지 않습니다.", "Mark this yourself after reading. Next does not award completion credit.")}
                  </div>
                </div>
              </>}
              {tab === "example" && <>
                <h2>{t("선택한 환경의 준비 확인", "Check the selected environment")}</h2><LessonText text={preparation.body[locale]} /><pre><code>{preparation.code}</code></pre>
                <h2>{t("실행 명령", "Run commands")}</h2><pre><code>{chapter.run}</code></pre>
                {chapter.concepts.filter(section => section.code).map(section => <section key={section.title.en}><h2>{section.title[locale]}</h2><pre><code>{section.code}</code></pre><h3>{t("예상 출력 (실제 실행 기록 아님)", "Expected output (not a run record)")}</h3><pre>{section.output[locale]}</pre></section>)}
                {chapter.exampleFiles && <><h2>{t("전체 예제 파일", "Complete example files")}</h2><ul>{chapter.exampleFiles.map(file => <li key={file}><code>{file}</code></li>)}</ul></>}
                <h2>{t("격리 예제 검증 명령", "Isolated example verification")}</h2><p>{verificationDescription(stage.id)[locale]}</p><pre><code>{verificationCommands(platform, stage.id)}</code></pre>
                <details className="curriculum-shell-reference"><summary>{t("셸·경로·컴파일·Compose 참고", "Shell, paths, compilation and Compose reference")}</summary><p>{shellReference[platform].body[locale]}</p><pre><code>{shellReference[platform].code}</code></pre></details>
                <h2>{t("따라 해 보기", "Guided exercise")}</h2><LessonText text={chapter.guided[locale]} />
              </>}
              {tab === "flow" && <>
                <p>{t("설명용 흐름입니다. 실시간 추적이 아닙니다. 단계를 선택해 이동하는 값과 실패 지점을 확인하세요.", "This is an explanatory flow, not a live trace. Select a step to inspect values and failure boundaries.")}</p>
                <div className="curriculum-flow">{chapter.flow.map((part, i) => <button className="learn-secondary" key={part.title.en} aria-pressed={node === i} onClick={() => setNode(i)}>{i + 1}. {part.title[locale]}{i < chapter.flow.length - 1 ? " →" : ""}</button>)}</div>
                <div className="learning-box" aria-live="polite"><h2>{chapter.flow[node].title[locale]}</h2><LessonText text={chapter.flow[node].body[locale]} /></div>
                <h2>{t("먼저 예측하기", "Predict first")}</h2><LessonText text={chapter.prediction[locale]} />
                <label htmlFor="curriculum-prediction">{t("내 예측", "My prediction")}</label><textarea id="curriculum-prediction" value={progress.notes[stage.id] ?? ""} onChange={event => update({ ...progress, notes: { ...progress.notes, [stage.id]: event.target.value } })} />
                <button className="learn-secondary" aria-expanded={answer} aria-controls="prediction-explanation" onClick={() => setAnswer(!answer)}>{t("해설 보기/접기", "Show/hide explanation")}</button>{answer && <div id="prediction-explanation" className="learning-explanation"><h3>{t("예측과 비교해 보세요", "Compare with your prediction")}</h3><LessonText text={chapter.answer[locale]} /></div>}
                <KnowledgeCheck key={stage.id} stage={stage.id} />
              </>}
              {tab === "troubleshoot" && <><h2>{t("의도적 실패와 진단 순서", "Deliberate failure and diagnosis")}</h2><LessonText text={chapter.failure[locale]} /><h3>{t("선택한 OS의 실행 문제", "Execution issues on the selected OS")}</h3><LessonText text={preparation.troubleshooting[locale]} /><p>{t("실제 입력, 예상 결과, 실제 결과, 확인한 원인, 바꾼 한 가지, 재검증 결과를 기록하세요. 실행하지 않았다면 실행하지 않았다고 적습니다.", "Record input, expected result, actual result, checked cause, one change and verification. If you did not run it, say so.")}</p></>}
              {tab === "practice" && <>
                <h2>{t("혼자 풀기", "Independent practice")}</h2><LessonText text={chapter.exercise[locale]} />
                <details className="learning-disclosure"><summary>{t("힌트", "Hint")}</summary><span className="disclosure-context">{t("필요할 때만 펼쳐 보세요", "Open when you need a nudge")}</span><LessonText text={chapter.hint[locale]} /></details>
                <details className="learning-disclosure"><summary>{t("풀이와 비교", "Compare with the explanation")}</summary><span className="disclosure-context">{t("내 풀이와 다른 이유를 찾아보세요", "Find why your approach differs")}</span><LessonText text={chapter.solution[locale]} /></details>
                <h2>{t("확인 가능한 통과 기준", "Observable pass criteria")}</h2><LessonText text={chapter.criteria[locale]} />
                <label htmlFor="practice-evidence">{t("내 실행·검증 기록", "My execution and verification record")}</label><textarea id="practice-evidence" value={progress.evidence[stage.id] ?? ""} onChange={event => { setPracticeChecked(false); setPracticeFeedback(false); update({ ...progress, evidence: { ...progress.evidence, [stage.id]: event.target.value } }); }} />
                <label className="learning-checkbox-row"><input type="checkbox" checked={practiceChecked} onChange={event => { setPracticeChecked(event.target.checked); setPracticeFeedback(false); if (!event.target.checked) { const reviewed = { ...progress.reviewed }; delete reviewed[stage.id]; update({ ...progress, reviewed }); } }} /><span>{t("통과 기준을 내 기록과 대조했습니다 (자기 확인)", "I compared the pass criteria with my record (self-review)")}</span></label>
                <button className="learn-primary" disabled={!practiceChecked || !(progress.evidence[stage.id] ?? "").trim()} onClick={savePractice}>{t("자기 확인 기록 저장", "Save self-review record")}</button>
                <div className={`practice-confirmation ${practiceFeedback ? "just-recorded" : ""}`} role="status" aria-live="polite" aria-atomic="true">{practiceFeedback ? t("자기 확인 기록을 저장했습니다. 실행·통과 여부는 직접 작성한 증거에 따르며 자동 검증하지 않습니다.", "Self-review record saved. Execution and pass claims depend on your written evidence; they are not automatically verified.") : progress.reviewed[stage.id] === progress.evidence[stage.id] && progress.evidence[stage.id]?.trim() ? t("저장된 자기 확인 기록이 있습니다. 숙련 인증은 아닙니다.", "A saved self-review record is available. This is not certification.") : t("실행 여부와 결과를 적고 통과 기준과 대조한 뒤 저장하세요. 실행하지 않았어도 사실대로 기록할 수 있습니다.", "Record whether you ran it and the result, compare with the criteria, then save. You can honestly record that you did not run it.")}</div>
                <p>{t("이 기록은 자기 보고이며 자동 채점이나 숙련 인증이 아닙니다. 독립 수행과 검토 결과를 구분해 적으세요. 다음 버튼은 완료 점수를 올리지 않습니다.", "This is a self-report, not automatic grading or certification. Distinguish independent work from review results. Next does not increase a completion score.")}</p>
              </>}
            </section>
          </>}
          <nav className="learning-next" aria-label={t("단계 이동", "Stage navigation")}><button className="learn-secondary" disabled={index === 0} onClick={() => select(roadmap[index - 1].id)}>{t("이전 학습", "Previous lesson")}</button><button className="learn-primary" disabled={index === roadmap.length - 1} onClick={() => select(roadmap[index + 1].id)}>{t("다음 학습", "Next lesson")}</button></nav>
        </article>
        <aside className={`learning-coach ${help ? "open" : ""}`} aria-label={t("학습 도움", "Learning help")}><button className="learning-help-toggle" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? t("학습 도움 닫기", "Close learning help") : t("학습 도움 열기", "Open learning help")}</button><div className="learning-coach-content"><h2>{t("지금의 목표", "Current goal")}</h2><p>{chapter?.criteria[locale] ?? stage.summary[locale]}</p><hr /><p>{t("작성된 학습 안내입니다. AI 대화가 아닙니다.", "Written learning guidance. This is not an AI chat.")}</p><p>{chapter?.hint[locale]}</p><strong>{t("읽기와 독립 수행은 별개입니다.", "Reading and independent performance are separate.")}</strong></div></aside>
      </div>
    </>}
    </div>
  </div>;
}
