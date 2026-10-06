import { expect,test } from '@playwright/test';
const legacy='incidentlens.curriculum.progress.v1';
test('tool navigation, guides and settings preserve learning records and never mutate the server',async({page})=>{
  const writes:string[]=[];
  await page.route('**/api/**',route=>{
    const r=route.request();if(r.method()!=='GET')writes.push(r.method());
    return route.fulfill({json:new URL(r.url()).pathname==='/api/overview'?{services:[],metrics:{},activeFault:null}:[]});
  });
  await page.goto('/');await page.evaluate(key=>{localStorage.setItem(key,JSON.stringify({tools:true}));localStorage.setItem('incidentlens.learning.platform.v1','windows');localStorage.setItem('incidentlens.pc-settings.draft.v1',JSON.stringify({mode:'learning'}));},legacy);
  await expect(page.locator('.primary-navigation button').first()).toHaveText('자유실험실');
  await expect(page.locator('.unified-landing')).toContainText('자체 데모');
  await expect(page.getByLabel('프로그래밍 언어')).toHaveCount(0);
  await page.locator('.primary-navigation button').nth(1).click();
  await expect(page.locator('.lab-guides')).toBeVisible();
  await page.getByRole('button',{name:'Apache Kafka',exact:true}).click();
  await expect(page.locator('.technology-guide h1')).toHaveText('Apache Kafka');
  await page.getByRole('button',{name:'장애 실험 설정 열기',exact:true}).click();
  await expect(page).toHaveURL(/view=lab/);
  await page.locator('.primary-navigation button').last().click();
  await expect(page.locator('input[value="frontend"]')).toBeChecked();
  await expect(page.locator('#settings-platform')).toHaveValue('windows');
  await page.locator('#settings-platform').selectOption('linux');
  await expect(page.locator('.pc-settings')).toContainText('--mode ui');
  await page.locator('.learning-brand').click();
  await page.locator('.theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('.language-select').selectOption('en');await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('.unified-landing')).toContainText('own demo services');
  expect(await page.evaluate(key=>localStorage.getItem(key),legacy)).toBe(JSON.stringify({tools:true}));
  expect(await page.evaluate(()=>localStorage.getItem('incidentlens.learning.platform.v1'))).toBe('windows');
  expect(writes).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('legacy lesson URL explains private access; embed opens the lab directly',async({page})=>{
 await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/overview'?{services:[],metrics:{},activeFault:null}:[]}));
 await page.goto('/?view=learn');await expect(page.getByRole('heading',{name:'일반 백엔드 학습이 분리되었습니다'})).toBeVisible();
 await expect(page.locator('.unified-landing')).toContainText('초대된 계정');
 await page.goto('/?embed=1');await expect(page.locator('.lab-guide')).toBeVisible();await expect(page.locator('.unified-landing')).toHaveCount(0);await expect(page.locator('.unified-topbar')).toHaveCount(0);
});
test('legacy experiment direct links restore their own session without merging lab selections',async({page})=>{
 const sessions=['legacy-python','lab-session'].map(id=>({id,name:id,scenario:'CACHE_DEGRADATION',status:'CREATED',createdAt:'2026-10-06T00:00:00Z',updatedAt:'2026-10-06T00:00:00Z'}));
 await page.route('**/api/**',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({json:p==='/api/overview'?{services:[],metrics:{},activeFault:null}:p==='/api/sessions'?sessions:{session:sessions.find(s=>p.endsWith(s.id)),evidence:[],activations:[],experiments:[],report:null}})});
 await page.addInitScript(()=>{localStorage.setItem('incidentlens.learning.code-language.v1','python');localStorage.setItem('incidentlens.learning.session.python.v1','legacy-python');localStorage.setItem('incidentlens.lab.session','lab-session');});
 await page.goto('/?view=evidence&context=learning');await expect(page.getByLabel('장애 세션')).toHaveValue('legacy-python');
 await page.locator('.primary-navigation button').first().click();await expect(page.getByLabel('장애 세션')).toHaveValue('lab-session');
 await page.goBack();await expect(page.getByLabel('장애 세션')).toHaveValue('legacy-python');await page.reload();await expect(page.getByLabel('장애 세션')).toHaveValue('legacy-python');
});
