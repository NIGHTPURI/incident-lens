import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { codeLanguages, CODE_LANGUAGE_KEY, readCodeLanguage, type CodeLanguage } from './programming-tracks';
import { readPlatform, savePlatform, platformIntro, type LearningPlatform } from './platform';
import { canonicalStage, readTrack, saveTrack, type TrackRecord } from './track-state';
import { introductions, trackChapter } from './track-content';
import { languageStages, type LanguageStage } from './language-depth-data';
import CurriculumContents, { lessonGroups } from './CurriculumContents';
import TrackLesson from './TrackLesson';
import LessonText from './LessonText';
import { TechnologyGuide, technologyGuides, technologyGroups } from './technology-guides';
type Props = { view: 'home' | 'lesson'; onViewChange: (view: 'home' | 'lesson') => void; onContextChange: () => void; onReference: () => void; onLanding?: () => void; area?: 'path' | 'technology'; onAreaChange?: (area: 'path' | 'technology') => void };
const fallback = { getItem: () => null, setItem: () => {} };
export default function Curriculum(props: Props) {
  const { locale } = useI18n(), t = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [language, setLanguage] = useState<CodeLanguage>(() => { try { return readCodeLanguage(localStorage); } catch { return 'java'; } });
  const [record, setRecord] = useState<TrackRecord>(() => { try { return readTrack(localStorage, language); } catch { return readTrack(fallback, language); } });
  const [platform, setPlatform] = useState<LearningPlatform>(() => { try { return readPlatform(localStorage, navigator.platform); } catch { return 'linux'; } });
  const [saved, setSaved] = useState(true);
  const [area, setArea] = useState(props.area ?? 'path');
  const [technology, setTechnology] = useState('redis');
  const [list, setList] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(lessonGroups.map(g => g.id));
  const menu = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null), sidebar = useRef<HTMLElement>(null), current = useRef<HTMLButtonElement>(null);
  useEffect(() => { setArea(props.area ?? 'path'); }, [props.area]);
  useEffect(() => { if (props.view === 'lesson') current.current?.scrollIntoView?.({ block: 'nearest' }); }, [record.stage, language, list, props.view]);
  useEffect(() => {
    if (!list) return;
    const media = window.matchMedia?.('(max-width: 820px)'); if (!media?.matches) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => close.current?.focus());
    function keydown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab') return;
      const buttons = [...(sidebar.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])].filter(b => !b.closest('[hidden]'));
      if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0]?.focus(); }
    }
    const resize = () => { if (!media.matches) setList(false); };
    document.addEventListener('keydown', keydown); media.addEventListener('change', resize);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); media.removeEventListener('change', resize); };
  }, [list]);
  function closeMenu() { setList(false); requestAnimationFrame(() => menu.current?.focus()); }
  function update(next: TrackRecord) { setRecord(next); try { setSaved(saveTrack(localStorage, language, next)); } catch { setSaved(false); } }
  function switchArea(next: 'path' | 'technology') { props.onContextChange(); setArea(next); setList(false); props.onAreaChange?.(next); }
  function home() { switchArea('path'); props.onViewChange('home'); window.scrollTo({ top: 0 }); }
  function select(stage: LanguageStage) {
    update({ ...record, stage }); switchArea('path'); props.onViewChange('lesson');
    requestAnimationFrame(() => { const h = document.querySelector<HTMLElement>('.track-lesson h1'); h?.focus(); h?.scrollIntoView({ block: 'start' }); });
  }
  function chooseLanguage(next: CodeLanguage) {
    if (next === language) return;
    props.onContextChange(); setLanguage(next);
    try { setRecord(readTrack(localStorage, next)); localStorage.setItem(CODE_LANGUAGE_KEY, next); setSaved(true); } catch { setRecord(readTrack(fallback, next)); setSaved(false); }
    window.dispatchEvent(new CustomEvent('incidentlens-language-change', { detail: next }));
    home();
  }
  const name = codeLanguages.find(l => l.id === language)!.name, intro = introductions[language];
  const chapter = trackChapter(language, record.stage, platform);
  return <div className="learning-root curriculum curriculum-shell">
    {list && <div className="curriculum-backdrop" onClick={closeMenu} aria-hidden="true" />}
    <aside id="learning-sidebar" ref={sidebar} className={`curriculum-sidebar ${list ? 'open' : ''}`} role={list ? 'dialog' : undefined} aria-modal={list ? true : undefined} aria-label={t('백엔드 학습실 목차', 'Backend Learning contents')}>
      <div className="curriculum-sidebar-header"><button className="curriculum-brand" onClick={props.onLanding ?? home}><span className="brand-mark" aria-hidden="true">iL</span><span>IncidentLens<strong>{t('백엔드 학습', 'Backend Learning')}</strong></span></button><button className="curriculum-menu-close" ref={close} onClick={closeMenu} aria-label={t('학습 목록 닫기', 'Close lesson list')}>×</button></div>
      <div className="curriculum-area-switch"><button aria-pressed={area === 'path'} onClick={home}>{t('학습 홈', 'Learning home')}</button><button aria-pressed={area === 'technology'} onClick={() => switchArea('technology')}>{t('기술 사전', 'Technology guides')}</button></div>
      <div className="curriculum-sidebar-progress"><strong>{name}</strong><span>{t('읽기 기록 · 자기 표시', 'Reading record · self-marked')} {record.read.length} / 15</span><progress value={record.read.length} max={15} aria-label={t('읽기 기록 · 숙련 점수 아님', 'Reading record · not a mastery score')} /></div>
      {area === 'path' ? <CurriculumContents locale={locale} record={record} lesson={props.view === 'lesson'} expanded={expanded} onExpand={id => setExpanded(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])} onStage={select} onHome={home} current={current} /> : <nav className="curriculum-tree curriculum-tech-tree" aria-label={t('기술 사전 목차', 'Technology guide contents')}>{technologyGroups.map(group => <section className="curriculum-tree-group" key={group.id}><span className="curriculum-guide-title">{group[locale]}</span>{technologyGuides.filter(g => g.group === group.id).map(g => <button className="curriculum-lesson-link" key={g.id} aria-current={technology === g.id ? 'step' : undefined} onClick={() => { setTechnology(g.id); setList(false); }}>{g.name}</button>)}</section>)}</nav>}
      <p className="curriculum-sidebar-note">{t('읽기·메모·자기 확인은 언어별로 저장됩니다. 직접 실행이나 숙련 인증과는 별개입니다.', 'Reading, notes and self-review are saved per language. They are separate from execution and certification.')}</p>
    </aside>
    <div className="curriculum-content">
      <div className="curriculum-mobile-current"><button className="learn-secondary curriculum-menu-toggle" ref={menu} aria-expanded={list} aria-controls="learning-sidebar" onClick={() => setList(true)}>{t('☰ 수업 목록', '☰ Lesson list')}</button><span>{name} · {area === 'technology' ? t('기술 사전', 'Technology guides') : props.view === 'home' ? t('언어 소개', 'Introduction') : languageStages.find(s => s[0] === record.stage)![locale === 'ko' ? 1 : 2]}</span></div>
      <div className="curriculum-toolbar learning-lesson-nav"><label className="curriculum-language" htmlFor="learning-code-language">{t('프로그래밍 언어', 'Programming language')}<select id="learning-code-language" value={language} onChange={e => chooseLanguage(e.target.value as CodeLanguage)}>{codeLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label className="curriculum-platform" htmlFor="learning-platform">{t('학습 OS / 셸', 'Learning OS / shell')}<select id="learning-platform" value={platform} onChange={e => { const next = e.target.value as LearningPlatform; setPlatform(next); try { setSaved(savePlatform(localStorage, next)); } catch { setSaved(false); } }}><option value="windows">Windows (PowerShell)</option><option value="linux">Linux (Bash · WSL)</option></select></label><button className="learn-secondary learning-home-link" onClick={home}>{t('학습 홈', 'Learning home')}</button></div>
      {!saved && <p role="status">{t('브라우저에 저장하지 못했습니다. 새로고침 전에 기록을 복사하세요.', 'Could not save in this browser. Copy your notes before reloading.')}</p>}
      {area === 'technology' ? <TechnologyGuide id={technology} locale={locale} languageName={name} onStage={id => select(canonicalStage(id))} /> : props.view === 'home' ? <section className="track-introduction">
        <span className="learning-kicker">{t('백엔드 학습 · 언어 소개', 'Backend Learning · Introduction')}</span><h1>{name}{t('로 배우는 백엔드', ' for backend development')}</h1><LessonText text={intro.what[locale]} />
        <div className="track-intro-actions"><button className="learn-primary" onClick={() => select('tools')}>{t('학습하기', 'Start learning')}</button><button className="learn-secondary" onClick={() => select(record.stage)}>{t('이어서 학습', 'Continue learning')} <span aria-hidden="true">→</span></button></div>
        <p className="resume-location">{t('마지막 위치', 'Last position')}: {languageStages.find(s => s[0] === record.stage)![locale === 'ko' ? 1 : 2]}</p>
        <div className="track-intro-cards"><section><span className="intro-number">01</span><h2>{t('어디에 쓰나요?', 'Where is it used?')}</h2><LessonText text={intro.why[locale]} /></section><section><span className="intro-number">02</span><h2>{t('어떻게 배우나요?', 'How will you learn?')}</h2><LessonText text={intro.frameworks[locale]} /></section><section><span className="intro-number">03</span><h2>{t('무엇을 준비하나요?', 'What do you need?')}</h2><p>{platformIntro[platform][locale]}</p><pre><code>{platform === 'windows' ? intro.windowsCheck : intro.linuxCheck}</code></pre></section></div>
        <div className="track-scope"><strong>{t('네 언어, 같은 학습 흐름', 'Four languages, one learning path')}</strong><p>{t('환경·문법부터 HTTP, API, DB, 테스트와 운영까지 15단계를 탐색합니다. 언어를 선택해도 수업이나 서버가 자동 실행되지 않습니다.', 'Explore 15 stages from setup and syntax to HTTP, APIs, databases, testing and operations. Choosing a language does not open a lesson or run a server.')}</p><p>{t('자유실험실의 실제 서비스는 Java / Spring Boot입니다. Python·JavaScript/TypeScript·C# 예제는 별도 연습 프로젝트이며 해당 서버의 장애 실험이 구현됐다는 뜻은 아닙니다.', 'The actual free-lab services use Java / Spring Boot. Python, JavaScript/TypeScript and C# examples are separate practice projects; their fault experiments are not implemented in the free lab.')}</p><button className="text-button" onClick={props.onReference}>{t('기존 공통 개념·실험 수업과 저장 기록', 'Existing shared concept/experiment lessons and saved records')} ↗</button></div>
      </section> : <><div className="curriculum-technology-links"><button className="learn-secondary" onClick={() => switchArea("technology")}>{t("공통 기술 사전", "Shared technology guides")} ↗</button>{technologyGuides.filter(g => g.stage && canonicalStage(g.stage) === record.stage && (language === "java" || g.id !== "java-spring")).map(g => <button className="learn-secondary" key={g.id} onClick={() => { setTechnology(g.id); switchArea('technology'); }}>{g.name} ↗</button>)}</div><TrackLesson key={`${language}:${record.stage}`} language={language} locale={locale} chapter={chapter} record={record} saved={saved} update={update} select={select} /></>}
    </div>
  </div>;
}
