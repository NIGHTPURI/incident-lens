import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import App from './App';
import {api} from './api';
import {I18nProvider} from './i18n/I18nProvider';
const session={id:'saved',name:'Existing navigation fixture',scenario:'DOWNSTREAM_LATENCY' as const,status:'CREATED',createdAt:'2026-10-06T00:00:00Z',updatedAt:'2026-10-06T00:00:00Z'};
beforeEach(()=>{
 window.history.replaceState(null,'','/');localStorage.clear();localStorage.setItem('incidentlens.lab.session','saved');
 vi.spyOn(api,'overview').mockResolvedValue({services:[{name:'redis',status:'UP'}],metrics:{requestCount:0,errorCount:0,p95Ms:null,kafkaLag:0,cacheHitRate:null},activeFault:{sessionId:'saved',scenario:'DOWNSTREAM_LATENCY',enabled:true,parameter:123,expiresAt:'2099-01-01T00:00:00Z'}});
 vi.spyOn(api,'sessions').mockResolvedValue([session]);vi.spyOn(api,'session').mockResolvedValue({session,evidence:[],activations:[],experiments:[],report:null});
});
afterEach(()=>{vi.restoreAllMocks();localStorage.clear();window.history.replaceState(null,'','/');});
async function mount(){await act(async()=>{render(<I18nProvider><App/></I18nProvider>)});}
it('opens saved sessions and keeps one navigation, selection and active fault across tabs without mutations',async()=>{
 const fault=vi.spyOn(api,'setFault'),create=vi.spyOn(api,'createSession'),collect=vi.spyOn(api,'collect'),analyze=vi.spyOn(api,'analyze');await mount();
 expect(screen.getByRole('heading',{name:'실험 세션',level:1})).toBeInTheDocument();
 for(const name of ['기술 설명','PC 실행 설정','관측','근거 · RCA','부하 · 전후 비교','장애 설정','실험 세션']){
  await act(async()=>fireEvent.click(screen.getByRole('button',{name})));
  expect(document.querySelectorAll('.tool-sidebar')).toHaveLength(1);expect(document.querySelectorAll('.tool-sidebar .nav-item')).toHaveLength(7);expect(screen.getByLabelText('장애 세션')).toHaveValue('saved');expect(document.querySelector('.fault-banner')).toBeInTheDocument();
 }
 for(const call of [fault,create,collect,analyze])expect(call).not.toHaveBeenCalled();
});
it('normalizes legacy home URLs and makes the logo return to sessions without extra history',async()=>{
 window.history.replaceState(null,'','/landing?view=landing');await mount();expect(location.pathname).toBe('/');expect(location.search).toContain('view=sessions');
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'기술 설명'})));
 await act(async()=>fireEvent.click(screen.getByRole('link',{name:'IncidentLens 실험 세션'})));expect(screen.getByRole('heading',{name:'실험 세션',level:1})).toBeInTheDocument();
});
it('keeps unfinished session input through tab navigation',async()=>{
 await mount();await act(async()=>fireEvent.click(screen.getByRole('button',{name:'장애 설정'})));
 fireEvent.change(screen.getByLabelText('세션 이름'),{target:{value:'Unsubmitted draft'}});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'기술 설명'})));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'장애 설정'})));
 expect(screen.getByLabelText('세션 이름')).toHaveValue('Unsubmitted draft');await waitFor(()=>expect(localStorage.getItem('incidentlens.lab.session')).toBe('saved'));
});
