import { useState } from 'react';
import { useI18n } from './i18n/I18nProvider';
import { TechnologyGuide, technologyGroups, technologyGuides } from './lab-guides/technology-guides';
export default function LabGuides({ onLab }: { onLab: () => void }) {
  const { locale } = useI18n();
  const [id,setId] = useState('redis');
  const t=(ko:string,en:string)=>locale==='ko'?ko:en;
  return <section className="lab-guides"><header className="learning-header"><span className="learning-kicker">INCIDENTLENS · {t('장애와 관측의 기술 사전','Fault and observability guides')}</span><h1>{t('근거를 해석하는 기술','Understand the evidence')}</h1><p>{t('자체 Java / Spring 데모의 DB·캐시·메시징·관측·부하 도구를 설명합니다. 가이드 이동은 장애나 부하를 실행하지 않습니다.','Understand the database, cache, messaging, observability and load tools in our Java / Spring demo. Navigation does not run faults or load.')}</p></header><nav className="lab-guide-picker" aria-label={t('실험실 기술 선택','Choose a lab technology')}>{technologyGroups.map(group=><fieldset key={group.id}><legend>{group[locale]}</legend>{technologyGuides.filter(g=>g.group===group.id).map(g=><button className="learn-secondary" key={g.id} aria-pressed={id===g.id} onClick={()=>setId(g.id)}>{g.name}</button>)}</fieldset>)}</nav><TechnologyGuide key={id} id={id} locale={locale} onLab={onLab}/></section>;
}
