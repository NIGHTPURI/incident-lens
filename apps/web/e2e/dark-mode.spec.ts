import { navigate, sessionsViaLogo } from './navigation';
import { expect, test, type Page, type Locator } from "@playwright/test";

const session = { id: "theme-fixture", name: "Theme browser fixture", scenario: "DOWNSTREAM_LATENCY", status: "CREATED", createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:01:00Z" };
const metrics = { requestCount: 20, errorCount: 1, throughput: 2, successRate: .95, p50Ms: 20, p95Ms: 100, p99Ms: 110, dbQueryP95Ms: 10, kafkaLag: 1, cacheHitRate: .8 };
async function mockApi(page: Page, fail = false) {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") { writes.push(route.request().url()); await route.abort(); return; }
    if (fail) { await route.fulfill({ status: 500, json: { detail: "Theme fixture unavailable" } }); return; }
    const path = new URL(route.request().url()).pathname;
    const evidence = { id: "theme-evidence", sessionId: session.id, service: "demo-api", source: "browser-fixture", type: "LATENCY_P95", value: 100, unit: "ms", windowStart: session.createdAt, windowEnd: session.updatedAt, explanation: "Presentation fixture, not measured evidence", phase: "BEFORE" };
    await route.fulfill({ json: path === "/api/overview" ? { services: [{ name: "demo-api", status: "UP" }], metrics: { ...metrics, p95Ms: null }, activeFault: { sessionId: session.id, scenario: session.scenario, enabled: true, parameter: 100, expiresAt: "2099-01-01T00:00:00Z" } } : path === "/api/sessions" ? [session] : {
      session, evidence: [evidence], activations: [{ enabled: true, parameter: 100, occurredAt: session.createdAt }],
      experiments: [{ id: "theme-experiment", sessionId: session.id, workload: { vus: 2, durationSeconds: 5 }, before: metrics, after: { ...metrics, p95Ms: 20 }, status: "COMPLETE", createdAt: session.createdAt }, { id: "theme-created", sessionId: session.id, workload: { vus: 2, durationSeconds: 5 }, before: null, after: null, status: "CREATED", createdAt: session.createdAt }],
      report: { summary: "Presentation fixture", suspectedRootCause: "A fixture is not a measured diagnosis", confidence: 0, evidenceIds: [evidence.id], impact: "No production impact asserted", recommendedActions: ["Collect real measurements"], uncertainties: ["Browser-only fixture"], provider: "fixture", generatedAt: session.updatedAt }
    } });
  });
  return writes;
}
async function readable(locator: Locator) {
  const colors = await locator.evaluate(el => {
    const style = getComputedStyle(el);
    let background = style.backgroundColor, parent = el.parentElement;
    while (background === "rgba(0, 0, 0, 0)" && parent) { background = getComputedStyle(parent).backgroundColor; parent = parent.parentElement; }
    return [style.color, background];
  });
  const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v => { const x=v/255; return x<=.04045?x/12.92:((x+.055)/1.055)**2.4; }).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
  const [a,b] = colors.map(luminance);
  expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05), `${await locator.getAttribute("class")} ${colors}`).toBeGreaterThanOrEqual(4.5);
}

test("legacy system migrates once, buttons toggle immediately and all preferences persist", async ({ page }) => {
  const writes = await mockApi(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => { if (!localStorage.getItem("theme-seeded")) { localStorage.setItem("theme-seeded", "1"); localStorage.setItem("incidentlens.theme.v1", "system"); } });
  await page.goto("/?view=settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("incidentlens.theme.v1"))).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" }); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const toggle = page.getByRole("button", { name: "라이트 모드로 전환" }); await toggle.focus(); await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "다크 모드로 전환" }).click();
  await page.locator("#settings-platform").selectOption("windows"); await page.locator(".language-select").selectOption("en");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await expect(page.locator("#settings-platform")).toHaveValue("windows"); await expect(page.locator(".language-select")).toHaveValue("en");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.emulateMedia({ colorScheme: "dark" }); await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await navigate(page, "Fault setup"); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await sessionsViaLogo(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(writes).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("both themes keep guides, populated lab and semantic feedback readable without mutations", async ({ page }) => {
  const writes = await mockApi(page); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/?view=technology");
  for (const theme of ["light", "dark"]) {
    if (await page.locator("html").getAttribute("data-theme") !== theme) await page.locator(".theme-toggle").click();
    await readable(page.locator(".technology-guide p").first());await readable(page.locator(".technology-guide pre").first());
    await navigate(page, "장애 설정");
    await expect(page.locator(".fault-banner")).toBeVisible(); await readable(page.locator(".fault-banner"));
    await readable(page.locator(".scenario-card.chosen"));
    const primary = page.locator(".button.primary").first(); await readable(primary); await primary.hover(); await readable(primary);
    await navigate(page, "관측"); await readable(page.locator(".status.good").first()); await readable(page.locator(".stat strong.unavailable").first()); await readable(page.locator(".stat-detail").first());
    await navigate(page, "근거 · RCA");
    await readable(page.locator(".evidence-title strong").first()); await readable(page.locator(".hypothesis h3"));
    await navigate(page, "부하 · 전후 비교");
    await readable(page.locator(".delta-better").first()); await readable(page.locator(".command-panel pre"));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await navigate(page, "기술 설명");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
  expect(writes).toEqual([]);
});

test("storage denial still follows the OS before mount and permits transient choice with readable errors", async ({ page }) => {
  const writes = await mockApi(page, true); await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Denied", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Denied", "SecurityError"); };
  });
  await page.goto("/"); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await navigate(page, "장애 설정"); await readable(page.locator(".message.error"));
  await expect(page.locator(".message.error")).toHaveCSS("color", "rgb(255, 177, 172)");
  await page.getByRole("button", { name: "라이트 모드로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light"); await readable(page.locator(".message.error"));
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(writes).toEqual([]);
});


test("pre-paint theme is resolved even before React loads, and invalid saved choices follow the OS", async ({ page }) => {
  await page.route("**/src/main.tsx", route => route.abort());
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => { if (!localStorage.getItem("incidentlens.theme.v1")) localStorage.setItem("incidentlens.theme.v1", "dark"); });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#11161f");
  expect(await page.locator("#root").textContent()).toBe("");
  await page.evaluate(() => localStorage.setItem("incidentlens.theme.v1", "invalid-old-value"));
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" }); await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
