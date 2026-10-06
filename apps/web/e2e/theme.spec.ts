import { expect, test } from "@playwright/test";

function contrast(a: string, b: string) {
  const luminance = (value: string) => {
    const [r,g,b] = value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(channel => { const v=channel/255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; });
    return r*.2126+g*.7152+b*.0722;
  };
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

test("home and free lab share reference tokens, states and accessible semantic colors", async ({ page }) => {
  const writes: string[]=[];
  await page.route("**/api/**",async route=>{
    if(route.request().method()!=="GET") { writes.push(route.request().url()); await route.abort(); return; }
    const path=new URL(route.request().url()).pathname;
    await route.fulfill({json:path==="/api/overview" ? {services:[{name:"demo-api",status:"UP"}],metrics:{requestCount:null,errorCount:null,p95Ms:null,kafkaLag:null,cacheHitRate:null},activeFault:{sessionId:"palette-fixture",scenario:"DOWNSTREAM_LATENCY",enabled:true,parameter:100,expiresAt:"2099-01-01T00:00:00Z"}} : []});
  });
  await page.goto("/");
  const primary=page.getByRole("button",{name:"자유실험실 열기"});
  await expect(primary).toHaveCSS("background-color","rgb(37, 116, 199)");
  await expect(page.locator("body")).toHaveCSS("background-color","rgb(255, 255, 255)");
  await page.locator(".primary-navigation").getByRole("button",{name:"자유실험실",exact:true}).click();
  await expect(page.locator(".sidebar")).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(page.locator(".button.primary").first()).toHaveCSS("background-color","rgb(37, 116, 199)");
  await expect(page.locator(".scenario-card.chosen")).toHaveCSS("background-color","rgb(232, 243, 255)");
  const button=page.locator(".button.primary").first();await button.hover();await expect(button).toHaveCSS("background-color","rgb(29, 98, 175)");
  await expect(page.locator(".nav-item.selected")).toHaveCSS("color","rgb(29, 98, 175)");
  const warning=page.locator(".fault-banner");await expect(warning).toBeVisible();await expect(warning).toHaveCSS("color","rgb(133, 80, 28)");
  const semantic=await warning.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));expect(contrast(semantic.fg,semantic.bg)).toBeGreaterThanOrEqual(4.5);
  expect(writes).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("errors remain red and distinct from blue actions when the backend is unavailable",async({page})=>{
  await page.route("**/api/**",route=>route.fulfill({status:500,json:{detail:"Palette fixture: backend unavailable"}}));
  await page.goto("/?view=learn");await page.locator(".primary-navigation").getByRole("button",{name:"자유실험실",exact:true}).click();
  const error=page.locator(".message.error");await expect(error).toBeVisible();await expect(error).toHaveCSS("color","rgb(157, 51, 44)");
  const colors=await error.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));expect(contrast(colors.fg,colors.bg)).toBeGreaterThanOrEqual(4.5);
});
