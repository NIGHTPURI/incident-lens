import { test, expect } from '@playwright/test';

test('learning report and comparison links keep their session through reload and history', async ({ page }) => {
  const sessions = ['learn-session', 'lab-session'].map(id => ({ id, name: id, scenario: 'DOWNSTREAM_LATENCY', status: 'CREATED', createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z' }));
  const writes: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('incidentlens.locale', 'en');
    if (!localStorage.getItem('incidentlens.learning.session')) localStorage.setItem('incidentlens.learning.session', 'learn-session');
    if (!localStorage.getItem('incidentlens.lab.session')) localStorage.setItem('incidentlens.lab.session', 'lab-session');
    localStorage.setItem('incidentlens.learning.mode', 'reference');
    localStorage.setItem('incidentlens.learning.view', 'lesson');
    localStorage.setItem('incidentlens.learning.lesson', 'diagnose');
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') writes.push(path);
    if (path === '/api/overview') return route.fulfill({json: { services: ['demo-api', 'demo-worker', 'redis'].map(name => ({name, status:'UP'})), metrics: {}, activeFault: null }});
    if (path === '/api/sessions') return route.fulfill({json: sessions});
    const session = sessions.find(s => path === `/api/sessions/${s.id}`);
    return route.fulfill({json: {session, evidence: [], activations: [], experiments: [], report: null}});
  });
  await page.goto('/?view=learn');
  await expect(page.locator('.learning-controls select')).toHaveValue('learn-session');
  await page.getByRole('button', {name: 'Open detailed evidence and report', exact: true}).click();
  await expect(page).toHaveURL(/view=evidence&context=learning/);
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('learn-session');
  await page.reload();
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('learn-session');
  await page.goBack();
  await expect(page.locator('.learning-controls select')).toHaveValue('learn-session');
  await page.getByRole('button', {name: 'Open full comparison', exact: true}).click();
  await expect(page).toHaveURL(/view=comparison&context=learning/);
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('learn-session');
  await page.reload();
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('learn-session');
  await page.locator('.sidebar .nav-item').filter({hasText: 'Free experiment lab'}).click();
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('lab-session');
  await page.goBack();
  await expect(page.getByLabel('Incident session', {exact: true})).toHaveValue('learn-session');
  expect(await page.evaluate(() => localStorage.getItem('incidentlens.lab.session'))).toBe('lab-session');
  expect(writes).toEqual([]);
});

test('four language records, last positions and legacy migration stay independent across history and reload', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/**', async route => { if (route.request().method() !== 'GET') writes.push(route.request().url()); await route.abort(); });
  await page.addInitScript(() => { if (!localStorage.getItem('migration-seeded')) {
    localStorage.setItem('migration-seeded', '1'); localStorage.setItem('incidentlens.learning.code-language.v1', 'go');
    localStorage.setItem('incidentlens.curriculum.v1', JSON.stringify({version:1, stage:'spring', read:['java'], notes:{spring:'legacy java'}, evidence:{java:'old java'}, reviewed:{java:'old java'}}));
    localStorage.setItem('incidentlens.learning.path.python.v1', JSON.stringify({read:['http'],evidence:{http:'old Python'},reviewed:{http:'old Python'}}));
    localStorage.setItem('incidentlens.learning.stage.python.v1','http');
  }});
  await page.goto('/?view=learn'); await expect(page.locator('#learning-code-language')).toHaveValue('java');
  await page.locator('.language-select').selectOption('en');
  await page.getByRole('button', {name:'Continue learning',exact:true}).click();
  await expect(page.locator('.track-lesson h1')).toHaveText('04 · API boundaries and structure');
  await page.getByRole('tab',{name:'Flow & notes',exact:true}).click(); await expect(page.getByLabel('My prediction · notes')).toHaveValue('legacy java');
  const old = await page.evaluate(() => localStorage.getItem('incidentlens.curriculum.v1'));
  for (const language of ['java','python','javascript','csharp']) {
    if (language === 'java') await page.locator('.learning-home-link').click(); else await page.locator('#learning-code-language').selectOption(language);
    await expect(page.locator('.track-introduction')).toBeVisible(); await expect(page.locator('.track-lesson')).toHaveCount(0);
    await page.getByRole('button', {name:'Continue learning',exact:true}).click();
    if(language==='python') { await expect(page.locator('.track-lesson h1')).toHaveText('03 · HTTP requests and responses'); await page.getByRole('tab',{name:'Self-review',exact:true}).click(); await expect(page.getByLabel('My execution and verification record')).toHaveValue('old Python'); }
    await page.getByRole('tab',{name:'Concept',exact:true}).click(); await page.getByRole('checkbox',{name:/Mark as read/}).check();
    await page.getByRole('tab',{name:'Flow & notes',exact:true}).click(); await page.getByLabel('My prediction · notes').fill(language+' note');
    await page.getByRole('tab',{name:'Self-review',exact:true}).click(); await page.getByLabel('My execution and verification record').fill(language+' result');
    await page.getByRole('radio').first().check(); await page.getByRole('button',{name:'Check answer',exact:true}).click();
    await page.getByRole('checkbox',{name:/I compared the criteria/}).check(); await page.getByRole('button',{name:'Save self-review record',exact:true}).click();
  }
  for (const language of ['python','java','csharp','javascript']) {
    await page.locator('#learning-code-language').selectOption(language); await expect(page.locator('.track-introduction')).toBeVisible();
    await page.getByRole('button',{name:'Continue learning',exact:true}).click(); await page.reload();
    await page.getByRole('tab',{name:'Flow & notes',exact:true}).click(); await expect(page.getByLabel('My prediction · notes')).toHaveValue(language+' note');
    await page.getByRole('tab',{name:'Self-review',exact:true}).click(); await expect(page.getByLabel('My execution and verification record')).toHaveValue(language+' result');
    await expect(page.getByRole('radio').first()).toBeChecked(); await expect(page.getByRole('checkbox',{name:/I compared the criteria/})).toBeChecked();
    await page.getByRole('tab',{name:'Concept',exact:true}).click(); await expect(page.getByRole('checkbox',{name:/Mark as read/})).toBeChecked();
  }
  expect(await page.evaluate(()=>localStorage.getItem('incidentlens.curriculum.v1'))).toBe(old);
  expect(writes).toEqual([]);
});

test('lab feedback and sessions stay separate while active fault stays visible', async ({ page }) => {
  const sessions = ['learn-session','lab-session'].map(id => ({ id, name: id, scenario: 'DOWNSTREAM_LATENCY', status: 'CREATED', createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' }));
  const writes: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('incidentlens.learning.session', 'learn-session');
    localStorage.setItem('incidentlens.lab.session', 'lab-session');
    localStorage.setItem('incidentlens.learning.mode', 'reference');
    localStorage.setItem('incidentlens.learning.view', 'lesson');
    localStorage.setItem('incidentlens.learning.lesson', 'diagnose');
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') writes.push(path);
    if (path === '/api/overview') return route.fulfill({ json: { services: [{name:'redis',status:'UP'}], metrics: {}, activeFault: {sessionId:'lab-session',scenario:'DOWNSTREAM_LATENCY',enabled:true,parameter:350,expiresAt:'2026-10-06T00:00:00Z'} } });
    if (path === '/api/sessions') return route.fulfill({json:sessions});
    if (path.endsWith('/evidence') && route.request().method() === 'POST') return route.fulfill({json:[]});
    const session = sessions.find(s => path === `/api/sessions/${s.id}`);
    return route.fulfill({json: session ? {session,evidence:[],activations:[],experiments:[],report:null} : {}});
  });
  await page.goto('/?view=evidence');
  await page.locator('.language-select').selectOption('en');
  await expect(page.getByLabel('Incident session', {exact:true})).toHaveValue('lab-session');
  await page.getByRole('button', {name:'Collect evidence',exact:true}).click();
  await expect(page.locator('.message.success')).toBeVisible();
  await page.locator('.sidebar .nav-item').filter({hasText:'Backend Learning'}).click();
  await expect(page.locator('.message.success')).toHaveCount(0);
  await expect(page.locator('.fault-banner')).toBeVisible();
  await expect(page.locator('.learning-controls select')).toHaveValue('learn-session');
  await page.goBack();
  await expect(page.getByLabel('Incident session', {exact:true})).toHaveValue('lab-session');
  await expect(page.locator('.message.success')).toHaveCount(0);
  expect(writes).toEqual(['/api/sessions/lab-session/evidence']);
});
