import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useI18n } from './i18n/I18nProvider';
export type NavigationItem = { id: string; label: string; symbol: string };
export default function ToolLayout({page,items,onNavigate,preferences,sessionControl,embedded,children}:{page:string;items:NavigationItem[];onNavigate:(id:string)=>void;preferences:ReactNode;sessionControl:ReactNode;embedded:boolean;children:ReactNode}) {
  const {locale,t}=useI18n(),label=(ko:string,en:string)=>locale==='ko'?ko:en;
  const [open,setOpen]=useState(false);
  const toggle=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null);
  const current=items.find(item=>item.id===page)?.label??label('기존 링크 안내','Legacy link notice');
  function close(){setOpen(false);toggle.current?.focus();}
  function navigate(id:string){setOpen(false);onNavigate(id);if(window.matchMedia?.('(max-width: 820px)').matches)toggle.current?.focus();}
  useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';drawer.current?.querySelector<HTMLButtonElement>('.menu-close')?.focus();return()=>{document.body.style.overflow=previous;};},[open]);
  useEffect(()=>{const media=window.matchMedia?.('(max-width: 820px)');const changed=()=>{if(!media?.matches)setOpen(false);};media?.addEventListener('change',changed);return()=>media?.removeEventListener('change',changed);},[]);
  function drawerKey(event:KeyboardEvent){
    if(!open)return;if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')??[]).filter(el=>el.getClientRects().length>0);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  return <div className={`app-shell tool-shell ${embedded?'embedded-mode':''}`}>
    <a className="skip-link" href="#main-content">{t('shell.skipToContent')}</a>
    {!embedded&&<>
      {open&&<div className="tool-backdrop" onClick={close} aria-hidden="true"/>}
      <aside id="tool-navigation" ref={drawer} className={`sidebar tool-sidebar ${open?'open':''}`} onKeyDown={drawerKey} role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label={label('실험 도구 탐색','Experiment navigation')}>
        <div className="tool-sidebar-brand"><a className="brand" href="?view=sessions" aria-label={label('IncidentLens 실험 세션','IncidentLens experiment sessions')} onClick={event=>{event.preventDefault();navigate('sessions');}}><span className="brand-mark" aria-hidden="true">iL</span><span>IncidentLens<small>{label('장애 · 부하 테스트','FAULT · LOAD TESTING')}</small></span></a><button className="menu-close" onClick={close} aria-label={label('메뉴 닫기','Close navigation')}>×</button></div>
        <span className="nav-label">{label('실험 워크스페이스','EXPERIMENT WORKSPACE')}</span>
        <nav aria-label={t('shell.navigation')}>{items.map(item=><button key={item.id} className={`nav-item ${page===item.id?'selected':''}`} aria-current={page===item.id?'page':undefined} onClick={()=>navigate(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}</nav>
        <div className="sidebar-note"><strong>{label('자체 데모 서비스 대상','Our demo services only')}</strong><p>{label('화면 이동으로 장애나 부하를 실행하지 않습니다.','Navigation never starts faults or load.')}</p></div>
        <div className="sidebar-footer">Java · Spring · k6<span>{label('로컬 실험 · 근거 기반 분석','Local experiments · evidence-based analysis')}</span></div>
      </aside>
    </>}
    <main>
      {!embedded&&<header className="tool-topbar"><div className="tool-topbar-inner"><button ref={toggle} className="menu-toggle" aria-controls="tool-navigation" aria-expanded={open} aria-label={label('탐색 메뉴 열기','Open navigation')} onClick={()=>setOpen(!open)}><span aria-hidden="true">☰</span></button><button className="tool-mobile-brand" onClick={()=>navigate('sessions')} aria-label={label('IncidentLens 실험 세션','IncidentLens experiment sessions')}>IncidentLens</button><div className="tool-selected-session">{sessionControl}</div><div className="tool-current-location"><span>{label('현재 위치','Current view')}</span><strong>{current}</strong></div><div className="topbar-preferences">{preferences}</div></div></header>}
      {children}
    </main>
  </div>;
}
