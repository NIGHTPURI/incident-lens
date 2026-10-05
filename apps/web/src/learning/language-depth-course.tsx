import { useEffect, useState } from 'react';
import type { Locale } from '../i18n/translations';
import type { CodeLanguage } from './programming-tracks';
import type { LearningPlatform } from './platform';
import { stagePractice } from './stage-practice';
import { depthChapter, languageStages, type LanguageStage } from './language-depth-data';

type Track = Exclude<CodeLanguage, 'java'>;
type PathRecord = { read: string[]; evidence: Record<string, string>; reviewed: Record<string, string> };
const empty = (): PathRecord => ({ read: [], evidence: {}, reviewed: {} });
export const pathKey = (language: Track) => `incidentlens.learning.path.${language}.v1`;
export function readPathRecord(storage: Pick<Storage, 'getItem'>, language: Track): PathRecord {
  try {
    const raw = JSON.parse(storage.getItem(pathKey(language)) ?? 'null');
    if (!raw || !Array.isArray(raw.read) || !raw.evidence || !raw.reviewed || typeof raw.evidence !== 'object' || typeof raw.reviewed !== 'object') return empty();
    const valid = new Set(languageStages.map(item => item[0]));
    return {
      read: raw.read.filter((id: unknown): id is string => typeof id === 'string' && valid.has(id as LanguageStage)),
      evidence: raw.evidence,
      reviewed: raw.reviewed,
    };
  } catch { return empty(); }
}

export default function LanguageDepthCourse({ language, locale, platform, stage, onStage, onReadCount }: { language: Track; locale: Locale; platform: LearningPlatform; stage: LanguageStage; onStage: (stage: LanguageStage) => void; onReadCount: (count: number) => void }) {
  const t = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [record, setRecord] = useState<PathRecord>(() => { try { return readPathRecord(localStorage, language); } catch { return empty(); } });
  const [stored, setStored] = useState(true);
  useEffect(() => { try { const next = readPathRecord(localStorage, language); setRecord(next); onReadCount(next.read.length); } catch { setRecord(empty()); onReadCount(0); } }, [language]);
  const chapter = depthChapter(language, stage);
  const index = languageStages.findIndex(item => item[0] === stage);
  const name = languageStages[index];
  const value = record.evidence[stage] ?? '';
  const reviewed = Boolean(value.trim()) && record.reviewed[stage] === value;
  const windows = platform === 'windows';
  const command = windows ? chapter.run.replaceAll('python3', 'python.exe').replaceAll('node ', 'node.exe ').replaceAll('dotnet ', 'dotnet.exe ') : chapter.run;
  const example = windows && (stage === 'tools' || stage === 'http') ? chapter.code.replaceAll('python3', 'python.exe').replaceAll('node ', 'node.exe ').replaceAll('dotnet ', 'dotnet.exe ').replaceAll('curl -i', 'curl.exe -i') : chapter.code;
  function save(next: PathRecord) {
    setRecord(next);
    onReadCount(next.read.length);
    try { localStorage.setItem(pathKey(language), JSON.stringify(next)); setStored(true); }
    catch { setStored(false); }
  }
  return <section className="language-depth-course" aria-label={t('언어별 15단계 수업', '15-stage language course')}>
    <header className="learning-header"><span>{index + 1} / {languageStages.length}</span><h2 id="track-stage" tabIndex={-1}>{name[locale === 'ko' ? 1 : 2]}</h2><p>{chapter.intro[locale]}</p></header>
    <p className="learning-box"><strong>{t('선수 지식: ', 'Prerequisites: ')}</strong>{chapter.prerequisite[locale]}</p>
    <h3>{t('먼저 알아둘 말', 'Plain-language glossary')}</h3><p>{chapter.glossary[locale]}</p>
    <div className="learning-box"><h3>{t('요청·데이터 흐름', 'Request/data flow')}</h3><p>{chapter.flow[locale]}</p></div>
    <h3>{t('작은 예시', 'Small example')}</h3><pre><code>{example}</code></pre><p className="language-example-scope">{chapter.codeScope[locale]}</p>
    <p><strong>{t('실습 프로젝트 참고 파일: ', 'Practice project reference: ')}</strong><code>{chapter.projectFile}</code></p>
    {index >= 3 && <p className="learning-box">{t('고급 실습의 의존성·분리된 DB·토큰·서버/worker 준비 절차:', 'Advanced practice dependencies, isolated DB, token and server/worker setup:')} <code>examples/language-paths/advanced/README.md</code></p>}
    <details className="learning-disclosure"><summary>{t('실행 명령과 예상 결과', 'Run command and expected result')}</summary><pre><code>{command}</code></pre><p>{chapter.expected[locale]}</p></details>
    <section className="learning-box"><h3>{t('이 프로젝트에서 따라갈 경계', 'The boundary to follow in this project')}</h3><p>{stagePractice(stage, language)[locale]}</p></section>
    <h3>{t('실패 시 확인', 'When it fails')}</h3><p>{chapter.failure[locale]}</p>
    <h3>{t('대안과 한계', 'Alternatives and limits')}</h3><p>{chapter.tradeoffs[locale]}</p>
    <h3>{t('따라 해 보기', 'Guided practice')}</h3><p>{chapter.guided[locale]}</p>
    <h3>{t('혼자 풀기', 'Independent work')}</h3><p>{chapter.independent[locale]}</p>
    <details className="learning-disclosure"><summary>{t('힌트', 'Hint')}</summary><p>{chapter.hint[locale]}</p></details>
    <details className="learning-disclosure"><summary>{t('풀이와 비교', 'Compare with a solution')}</summary><p>{chapter.solution[locale]}</p></details>
    <h3>{t('확인 가능한 기준', 'Observable criteria')}</h3><p>{chapter.criteria[locale]}</p>
    <label className="learning-checkbox-row"><input type="checkbox" checked={record.read.includes(stage)} onChange={event => save({ ...record, read: event.target.checked ? [...new Set([...record.read, stage])] : record.read.filter(id => id !== stage) })} /><span>{t('읽기 완료로 기록 (숙련과 별개)', 'Mark as read (separate from mastery)')}</span></label>
    <label htmlFor="language-practice-evidence">{t('내 실행·검증 기록', 'My execution and verification record')}</label>
    <textarea id="language-practice-evidence" value={value} onChange={event => { const next = { ...record, evidence: { ...record.evidence, [stage]: event.target.value }, reviewed: { ...record.reviewed } }; delete next.reviewed[stage]; save(next); }} />
    <button className="learn-secondary" disabled={!value.trim()} onClick={() => save({ ...record, reviewed: { ...record.reviewed, [stage]: value } })}>{t('자기 확인 기록 저장', 'Save self-review record')}</button>
    <p role="status">{!stored ? t('브라우저에 저장하지 못했습니다. 새로고침 전에 기록을 복사하세요.', 'Could not save in this browser; copy your notes before reloading.') : reviewed ? t('자기 확인 기록이 있습니다. 자동 검증이나 숙련 인증은 아닙니다.', 'Self-review saved; this is neither automatic verification nor certification.') : t('실행하지 않았다면 미실행이라고 적으세요. 다음 단계로 이동해도 완료 점수는 오르지 않습니다.', 'If unrun, say so. Moving to the next stage does not award completion credit.')}</p>
    <a href={chapter.source} target="_blank" rel="noreferrer">{t('참고 자료', 'Reference')} ↗</a>
    <nav className="learning-next" aria-label={t('단계 이동', 'Stage navigation')}><button className="learn-secondary" disabled={index === 0} onClick={() => onStage(languageStages[index - 1][0])}>{t('이전 학습', 'Previous lesson')}</button><button className="learn-primary" disabled={index === languageStages.length - 1} onClick={() => onStage(languageStages[index + 1][0])}>{t('다음 학습', 'Next lesson')}</button></nav>
  </section>;
}
