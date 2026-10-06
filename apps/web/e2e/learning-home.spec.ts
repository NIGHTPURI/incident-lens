import { expect, test } from "@playwright/test";

test("logo opens a persistent home without clearing the last lesson or predictions", async ({ page }) => {
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });

  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.mode", "reference"));
  await page.goto("/?view=learn");
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  await page.locator(".learning-lesson-nav button").click();
  await page.getByRole("button", { name: "06 · 장애 분석과 회복" }).click();
  await page.getByLabel("내 예측").fill("응답 지연과 근거를 확인한다");
  await page.getByRole("button", { name: "캐시 우회", exact: true }).click();
  await page.locator("#scenario-prediction").fill("DB 조회가 늘어날 것이다");

  await page.locator(".learning-brand").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".unified-landing")).toBeVisible();
  await expect(page.getByRole("button", { name: "학습 언어 선택하기" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".unified-landing")).toBeVisible();
  await page.getByLabel("언어 선택").selectOption("en");
  await page.getByRole("button", { name: "Choose a learning language" }).click();
  await page.getByRole("button", { name: "Existing shared concept/experiment lessons and saved records ↗" }).click();
  await page.getByRole("button", { name: "Continue learning" }).click();
  await expect(page.getByRole("heading", { name: "06 · Diagnose and recover", level: 1 })).toBeVisible();
  await expect(page.getByLabel("My prediction")).toHaveValue("응답 지연과 근거를 확인한다");
  await expect(page.locator("#scenario-prediction")).toHaveValue("DB 조회가 늘어날 것이다");
  await expect(page.getByRole("button", { name: "Cache bypass", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.locator(".learning-brand").click();
  await expect(page.locator(".unified-landing")).toBeVisible();
  expect(writes).toEqual([]);
});

test("home retains an active fault and saved results, with disable only on explicit click", async ({ page }) => {
  const session = { id: "owner-session", name: "Saved experiment", scenario: "DOWNSTREAM_LATENCY", status: "CREATED", createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" };
  const otherSession = { ...session, id: "other-session", name: "Another experiment" };
  let activeFault: { sessionId: string; scenario: string; enabled: boolean; parameter: number; expiresAt: string } | null = { sessionId: session.id, scenario: session.scenario, enabled: true, parameter: 350, expiresAt: "2026-10-03T00:15:00Z" };
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
    if (path === "/api/overview") return route.fulfill({ json: { services: ["demo-api", "demo-worker", "redis"].map((name) => ({ name, status: "UP" })), metrics: { requestCount: null, errorCount: null, p95Ms: null, kafkaLag: null, cacheHitRate: null }, activeFault } });
    if (path === "/api/sessions") return route.fulfill({ json: [otherSession, session] });
    if (path === `/api/sessions/${otherSession.id}`) return route.fulfill({ json: { session: otherSession, activations: [], evidence: [], report: null, experiments: [] } });
    if (path === `/api/sessions/${session.id}`) return route.fulfill({ json: {
      session, activations: [], evidence: [],
      report: { summary: "Saved report for home test", suspectedRootCause: "A local delay may explain the response time", confidence: 0.5, evidenceIds: [], impact: "Local test only", recommendedActions: [], uncertainties: [], provider: "rule-based", generatedAt: "2026-10-03T00:00:00Z" },
      experiments: [{ id: "saved-experiment", sessionId: session.id, status: "COMPLETED", workload: { vus: 2, durationSeconds: 5 }, before: { p95Ms: 500, kafkaLag: 0 }, after: { p95Ms: 100, kafkaLag: 0 }, createdAt: "2026-10-03T00:00:00Z" }],
    } });
    if (path === `/api/sessions/${session.id}/fault` && request.method() === "PUT") {
      activeFault = null;
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: {} });
  });

  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.mode", "reference"));
  await page.goto("/?view=learn");
  await page.getByRole("button", { name: "06 · 장애 분석과 회복" }).click();
  await page.getByLabel("실험 세션").selectOption(session.id);
  await expect(page.getByText("Saved report for home test")).toBeVisible();
  await expect(page.locator(".learning-measures")).toContainText("500 ms");
  await page.locator(".learning-brand").click();
  await expect(page.locator(".unified-landing")).toBeVisible();
  await expect(page.locator(".fault-banner").getByRole("button", { name: "장애 비활성화" })).toBeVisible();
  expect(writes).toEqual([]);

  await page.reload();
  await expect(page.locator(".unified-landing")).toBeVisible();
  await expect(page.locator(".fault-banner").getByRole("button", { name: "장애 비활성화" })).toBeVisible();
  await page.getByRole("button", { name: "학습 언어 선택하기" }).click();
  await page.getByRole("button", { name: "기존 공통 개념·실험 수업과 저장 기록 ↗" }).click();
  await page.getByRole("button", { name: "이어서 학습" }).click();
  await expect(page.getByText("Saved report for home test")).toBeVisible();
  await expect(page.locator(".learning-measures")).toContainText("500 ms");
  await page.locator(".learning-brand").click();
  expect(writes).toEqual([]);
  await page.locator(".fault-banner").getByRole("button", { name: "장애 비활성화" }).click();
  await expect(page.locator(".fault-banner")).toHaveCount(0);
  expect(writes).toEqual([`PUT /api/sessions/${session.id}/fault`]);
});
