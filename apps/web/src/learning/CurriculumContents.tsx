import type { RefObject } from 'react';
import { languageStages, type LanguageStage } from './language-depth-data';
import type { TrackRecord } from './track-state';
import type { Locale } from '../i18n/translations';
export const lessonGroups = [
  { id: 'start', ko: '시작과 요청', en: 'Getting started & requests', lessons: ['tools', 'basics', 'http'] },
  { id: 'data', ko: 'API와 데이터', en: 'APIs & data', lessons: ['api', 'persistence', 'transactions'] },
  { id: 'quality', ko: '안전한 개발', en: 'Reliable development', lessons: ['security', 'testing', 'collaboration', 'operations'] },
  { id: 'systems', ko: '운영과 분산 시스템', en: 'Operations & distributed systems', lessons: ['observability', 'performance', 'concurrency', 'messaging'] },
  { id: 'project', ko: '독립 프로젝트', en: 'Independent project', lessons: ['capstone'] },
] as const;
export default function CurriculumContents({ locale, record, lesson, expanded, onExpand, onStage, onHome, current }: {
  locale: Locale; record: TrackRecord; lesson: boolean; expanded: string[]; onExpand: (id: string) => void;
  onStage: (id: LanguageStage) => void; onHome: () => void; current: RefObject<HTMLButtonElement | null>;
}) {
  const t = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return <nav className="curriculum-tree" aria-label={t('15단계 수업 목차', '15-stage lesson contents')}>
    <button className="curriculum-lesson-link curriculum-intro-link" aria-current={!lesson ? 'page' : undefined} onClick={onHome}>{t('언어 소개 · 학습 홈', 'Language introduction · learning home')}</button>
    {lessonGroups.map(group => <section className="curriculum-tree-group" key={group.id}>
      <button className="curriculum-group-toggle" aria-expanded={expanded.includes(group.id)} aria-controls={`lesson-group-${group.id}`} onClick={() => onExpand(group.id)}><span className="curriculum-chevron" aria-hidden="true">{expanded.includes(group.id) ? '▾' : '▸'}</span>{group[locale]}</button>
      <div id={`lesson-group-${group.id}`} hidden={!expanded.includes(group.id)}>{group.lessons.map(id => {
        const item = languageStages.find(stage => stage[0] === id)!;
        const active = lesson && record.stage === id;
        const evidence = record.evidence[id]?.trim(), reviewed = evidence && record.reviewed[id] === record.evidence[id];
        return <button key={id} ref={active ? current : undefined} className="curriculum-lesson-link" aria-current={active ? 'step' : undefined} onClick={() => onStage(id)}><span className="curriculum-lesson-title">{item[locale === 'ko' ? 1 : 2]}</span>{(record.read.includes(id) || evidence) && <span className="curriculum-lesson-mark">{reviewed ? t('자기확인 기록', 'Self-review saved') : evidence ? t('실습 기록', 'Practice note') : t('읽기 기록', 'Marked read')}</span>}</button>;
      })}</div>
    </section>)}
  </nav>;
}
