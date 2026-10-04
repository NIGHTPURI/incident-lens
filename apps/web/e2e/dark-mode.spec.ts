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

test("system changes and explicit themes preserve OS, language and progress across reload", async ({ page }) => {
  const writes = await mockApi(page);
  await page.emulateMedia({ colorScheme: "dark" }); await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("combobox", { name: "테마", exact: true })).toHaveValue("system");
  await page.emulateMedia({ colorScheme: "light" }); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const selector = page.getByRole("combobox", { name: "테마", exact: true }); await selector.focus();
  await expect(selector).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("End"); await page.keyboard.press("Enter");
  await expect(selector).toHaveValue("dark"); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  await page.getByRole("checkbox", { name: /읽기 완료로 기록/ }).check();
  await page.locator("#learning-platform").selectOption("windows"); await page.locator(".language-select").selectOption("en");
  await expect(page.getByRole("combobox", { name: "Theme", exact: true })).toHaveValue("dark");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#learning-platform")).toHaveValue("windows"); await expect(page.locator(".language-select")).toHaveValue("en");
  await expect(page.getByRole("checkbox", { name: /Mark as read/ })).toBeChecked();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("light");
  await page.emulateMedia({ colorScheme: "dark" }); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Free experiment", exact: true }).click();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" }); await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload(); await expect(page.getByRole("combobox", { name: "Theme", exact: true })).toHaveValue("system");
  expect(writes).toEqual([]); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("both themes keep learning, populated lab and semantic feedback readable without mutations", async ({ page }) => {
  const writes = await mockApi(page); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  for (const theme of ["light", "dark"]) {
    await page.getByRole("combobox", { name: "테마", exact: true }).selectOption(theme);
    await page.getByRole("tab", { name: "흐름", exact: true }).click();
    await page.getByRole("radio", { name: "파일이 삭제됩니다" }).check(); await page.getByRole("button", { name: "답 확인", exact: true }).click();
    await readable(page.locator(".check-feedback.retry"));
    await page.getByRole("radio", { name: "파일은 그대로 남습니다" }).check(); await page.getByRole("button", { name: "답 확인", exact: true }).click();
    await readable(page.locator(".check-feedback.correct"));
    await readable(page.getByRole("tab", { name: "흐름", exact: true }));
    await page.getByRole("tab", { name: "혼자 풀기" }).click(); await page.getByText("힌트", { exact: true }).click();
    await readable(page.locator("details.learning-disclosure summary").first());
    await page.getByRole("tab", { name: "최소 예제", exact: true }).click(); await readable(page.locator(".curriculum pre").first());
    await page.getByRole("button", { name: "자유 실험", exact: true }).click();
    await expect(page.locator(".fault-banner")).toBeVisible(); await readable(page.locator(".fault-banner"));
    await readable(page.locator(".scenario-card.chosen"));
    const primary = page.locator(".button.primary").first(); await readable(primary); await primary.hover(); await readable(primary);
    await page.getByRole("button", { name: "개요", exact: true }).click(); await readable(page.locator(".status.good").first()); await readable(page.locator(".stat strong.unavailable").first()); await readable(page.locator(".stat-detail").first());
    await page.getByRole("button", { name: "증거 및 RCA", exact: true }).click();
    await readable(page.locator(".evidence-title strong").first()); await readable(page.locator(".hypothesis h3"));
    await page.getByRole("button", { name: "실험 비교", exact: true }).click();
    await readable(page.locator(".delta-better").first()); await readable(page.locator(".command-panel pre"));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole("button", { name: "백엔드 실험실", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "테마", exact: true })).toHaveValue(theme);
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
  await page.getByRole("button", { name: "자유 실험", exact: true }).click(); await readable(page.locator(".message.error"));
  await expect(page.locator(".message.error")).toHaveCSS("color", "rgb(255, 177, 172)");
  await page.getByRole("combobox", { name: "테마", exact: true }).selectOption("light");
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
