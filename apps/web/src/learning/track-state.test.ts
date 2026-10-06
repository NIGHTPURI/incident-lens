import { afterEach, describe, expect, it } from 'vitest';
import { canonicalStage, readTrack, saveTrack, trackKey } from './track-state';
import { trackChapter } from './track-content';
import { languageStages } from './language-depth-data';
import { codeLanguages } from './programming-tracks';
afterEach(() => localStorage.clear());
describe('language records and additive migration', () => {
  it('maps legacy Java IDs and retains every original field and key', () => {
    const old = JSON.stringify({version:1, stage:'spring', read:['java','spring'], notes:{java:'note'},evidence:{spring:'result'},reviewed:{spring:'result'}});
    localStorage.setItem('incidentlens.curriculum.v1', old);
    localStorage.setItem('incidentlens.learning.prediction.outbox', 'old prediction');
    expect(readTrack(localStorage,'java')).toMatchObject({stage:'api',read:['basics','api'],notes:{basics:'note'},evidence:{api:'result'},reviewed:{api:'result'}});
    expect(localStorage.getItem('incidentlens.curriculum.v1')).toBe(old);
    expect(localStorage.getItem('incidentlens.learning.prediction.outbox')).toBe('old prediction');
  });
  it('migrates the three non-Java stores once and keeps later records independent', () => {
    for (const language of ['python','javascript','csharp'] as const) {
      const key=`incidentlens.learning.path.${language}.v1`, old=JSON.stringify({read:['http'],evidence:{http:language},reviewed:{http:language}});
      localStorage.setItem(key,old); localStorage.setItem(`incidentlens.learning.stage.${language}.v1`,'http');
      const r=readTrack(localStorage,language); expect(r).toMatchObject({stage:'http',read:['http'],evidence:{http:language},reviewed:{http:language}});
      saveTrack(localStorage,language,{...r,stage:'testing',notes:{testing:language+' note'}});
      expect(readTrack(localStorage,language).stage).toBe('testing'); expect(localStorage.getItem(key)).toBe(old);
    }
    expect(readTrack(localStorage,'java').notes).toEqual({});
  });
  it('recovers malformed records and rejects unknown IDs and non-string notes', () => {
    localStorage.setItem(trackKey('python'),'{'); expect(readTrack(localStorage,'python').stage).toBe('tools');
    localStorage.setItem(trackKey('python'),JSON.stringify({stage:'unknown',read:['api','unknown','api'],notes:{api:42,http:'kept',unknown:'discard'}}));
    expect(readTrack(localStorage,'python')).toMatchObject({stage:'tools',read:['api'],notes:{http:'kept'}});
    expect(canonicalStage('spring')).toBe('api');
  });
  it('provides authored bilingual sections for every language, stage and platform', () => {
    for (const language of codeLanguages) for (const [stage] of languageStages) for (const platform of ['windows','linux'] as const) {
      const c=trackChapter(language.id,stage,platform);
      for (const field of [c.summary,c.prerequisites,c.glossary,c.prediction,c.answer,c.guided,c.failure,c.exercise,c.hint,c.solution,c.criteria,c.tradeoffs,c.useCase,c.preparation]) {
        expect(field.ko.trim()).not.toBe(''); expect(field.en.trim()).not.toBe('');
      }
      expect(c.run.trim()).not.toBe(''); expect(c.concepts.length).toBeGreaterThan(0); expect(c.flow.length).toBeGreaterThan(0);
    }
  });
});
