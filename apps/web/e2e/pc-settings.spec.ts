import { expect, test } from '@playwright/test';
test('landing order, routes, active fault return and PC drafts never execute commands', async ({page}) => {
  const writes:string[]=[];
  const session={id:'existing-session',name:'Existing fixture',scenario:'CACHE_DEGRADATION',status:'CREATED',createdAt:'2026-10-06T00:00:00Z',updatedAt:'2026-10-06T00:00:00Z'};
  await page.route('**/api/**',async route=>{
    if(route.request().method()!=='GET') writes.push(route.request().url());
    const path=new URL(route.request().url()).pathname;
    await route.fulfill({json:path==='/api/overview'?{services:[],metrics:{},activeFault:{sessionId:'existing-session',scenario:'CACHE_DEGRADATION',enabled:true,parameter:0,expiresAt:'2099-01-01T00:00:00Z'}}:path==='/api/runtime'?{instanceId:'declared-only',profile:'core',hostPorts:{controlPlane:18080,demoApi:18081,demoWorker:18082,web:13000,prometheus:19090,grafana:13001}}:path==='/api/sessions'?[session]:{session,activations:[],evidence:[],report:null,experiments:[]}});
  });
  await page.goto('/'); await expect(page.locator('.unified-landing')).toBeVisible();
  await expect(page.locator('.primary-navigation button').first()).toHaveText('자유실험실');
  await expect(page.locator('.landing-card')).toHaveCount(3); await expect(page.locator('.fault-banner')).toBeVisible();
  await page.getByRole('button',{name:'활성 실험으로 이동',exact:true}).click(); await expect(page).toHaveURL(/view=lab/);
  await page.locator('.learning-brand').click(); await expect(page.locator('.unified-landing')).toBeVisible();
  await page.locator('.primary-navigation button').last().click();
  await expect(page.locator('.pc-settings')).toBeVisible();
  await expect(page.locator('.pc-settings')).toContainText('브라우저');
  await page.locator('input[value="learning"]').check(); await expect(page.locator('.pc-settings')).toContainText('--mode learning');
  await page.locator('input[value="observability"]').check();
  await page.locator('#settings-vus').fill('3'); await page.locator('#settings-duration').fill('8');
  await page.getByRole('spinbutton',{name:'CONTROL_PLANE_PORT 호스트 포트',exact:true}).fill('18080');
  await page.reload(); await expect(page.locator('input[value="observability"]')).toBeChecked(); await expect(page.locator('#settings-vus')).toHaveValue('3');
  await expect(page.locator('.pc-settings')).toContainText('CONTROL_PLANE_PORT=18080');
  await page.getByRole('spinbutton',{name:'DEMO_API_PORT 호스트 포트',exact:true}).fill('18080'); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.pc-settings pre')).not.toContainText('CONTROL_PLANE_PORT=18080');
  await page.locator('.language-select').selectOption('en'); await expect(page.locator('.pc-settings')).toContainText('Browser-saved plan');
  await page.locator('.theme-toggle').click(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(writes).toEqual([]); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
