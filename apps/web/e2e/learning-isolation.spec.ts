import { test, expect } from '@playwright/test';

test('legacy Go recovers and language records survive history independently', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/**', async route => { if (route.request().method() !== 'GET') writes.push(route.request().url()); await route.abort('connectionrefused'); });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('incidentlens.learning.code-language.v1', 'go'));
  await page.reload();
  await expect(page.locator('#learning-code-language')).toHaveValue('java');
  expect(await page.evaluate(() => localStorage.getItem('incidentlens.learning.code-language.v1'))).toBe('java');
  await expect(page.locator('#learning-code-language option')).toHaveCount(4);
  await page.locator('.language-select').selectOption('en');
  await page.locator('#learning-code-language').selectOption('python');
  await page.locator('.language-depth-course input[type=checkbox]').check();
  await page.locator('#language-practice-evidence').fill('Python HTTP run record');
  await page.getByRole('button', { name: 'Save self-review record' }).click();
  await page.locator('#learning-code-language').selectOption('csharp');
  await expect(page.locator('#language-practice-evidence')).toHaveValue('');
  await page.locator('.learning-topbar button').filter({ hasText: 'Free experiment' }).click();
  await expect(page).toHaveURL(/view=lab/);
  await page.goBack();
  await expect(page.locator('#learning-code-language')).toHaveValue('csharp');
  await page.locator('#learning-code-language').selectOption('python');
  await expect(page.locator('#language-practice-evidence')).toHaveValue('Python HTTP run record');
  await expect(page.locator('.language-depth-course input[type=checkbox]')).toBeChecked();
  await page.reload();
  await expect(page.locator('#language-practice-evidence')).toHaveValue('Python HTTP run record');
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
