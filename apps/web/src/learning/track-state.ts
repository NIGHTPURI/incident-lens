import { readProgress } from './progress';
import { languageStages, type LanguageStage } from './language-depth-data';
import type { CodeLanguage } from './programming-tracks';

type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type TrackRecord = { version: 2; stage: LanguageStage; read: string[]; notes: Record<string, string>; evidence: Record<string, string>; reviewed: Record<string, string> };
export const trackKey = (language: CodeLanguage) => `incidentlens.learning.track.${language}.v2`;
export const canonicalStage = (id: string): LanguageStage => {
  const mapped = id === 'java' ? 'basics' : id === 'spring' ? 'api' : id;
  return languageStages.find(item => item[0] === mapped)?.[0] ?? 'tools';
};
export const javaStage = (id: LanguageStage) => id === 'basics' ? 'java' : id === 'api' ? 'spring' : id;
const empty = (): TrackRecord => ({ version: 2, stage: 'tools', read: [], notes: {}, evidence: {}, reviewed: {} });
function normalize(raw: { stage?: unknown; read?: unknown; notes?: unknown; evidence?: unknown; reviewed?: unknown }): TrackRecord {
  const ids = new Set<string>([...languageStages.map(item => item[0]), 'java', 'spring']);
  const map = (value: unknown): Record<string, string> => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([id, text]) => ids.has(id) && typeof text === 'string').map(([id, text]) => [canonicalStage(id), text])) : {};
  return { version: 2, stage: canonicalStage(typeof raw.stage === 'string' ? raw.stage : 'tools'),
    read: Array.isArray(raw.read) ? [...new Set(raw.read.filter(id => typeof id === 'string' && ids.has(id)).map(canonicalStage))] : [],
    notes: map(raw.notes), evidence: map(raw.evidence), reviewed: map(raw.reviewed) };
}
export function readTrack(storage: Store, language: CodeLanguage): TrackRecord {
  try {
    const saved = storage.getItem(trackKey(language));
    if (saved) return normalize(JSON.parse(saved));
    // Additive migration: keep every legacy key (including experiment records).
    let record: TrackRecord;
    if (language === 'java') record = normalize(readProgress(storage));
    else {
      const old = JSON.parse(storage.getItem(`incidentlens.learning.path.${language}.v1`) ?? '{}');
      record = normalize({ ...old, stage: storage.getItem(`incidentlens.learning.stage.${language}.v1`) ?? 'tools' });
    }
    try { storage.setItem(trackKey(language), JSON.stringify(record)); } catch { /* Reading still works. */ }
    return record;
  } catch { return empty(); }
}
export function saveTrack(storage: Store, language: CodeLanguage, record: TrackRecord): boolean {
  try { storage.setItem(trackKey(language), JSON.stringify(record)); return true; } catch { return false; }
}
