import { expect, test } from "@playwright/test";

test("offline lessons keep position and predictions across language, refresh and keyboard use", async ({ page }, testInfo) => {
  let writes = 0;
  await page.route("**/api/**", async (route) => {
    if (route.request().method() !== "GET") writes++;
    await route.abort("connectionrefused");
  });
  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.mode", "reference"));
  await page.goto("/?view=learn");
  await expect(page.getByRole("heading", { name: "요청 한 번이 지나가는 길을 따라가 보세요." })).toBeVisible();
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "학습 도움 열기" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("작성된 설명과 단계별 힌트입니다. AI 대화가 아닙니다.")).toBeVisible();
    await page.getByRole("button", { name: "학습 도움 닫기" }).click();
  }
  await page.screenshot({ path: testInfo.outputPath("learning-ko-first.png") });
  await page.getByRole("button", { name: "Redis", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("상품 목록 캐시 조회", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "학습 도움" })).toContainText("Redis · 상품 목록 캐시 조회");
  await page.getByLabel("내 예측").fill("캐시 미적중을 먼저 확인한다");
  await page.getByRole("button", { name: "다음 학습" }).click();
  await page.getByRole("button", { name: "이전 학습" }).click();
  await expect(page.getByLabel("내 예측")).toHaveValue("캐시 미적중을 먼저 확인한다");
  await page.getByLabel("언어 선택").selectOption("en");
  await page.screenshot({ path: testInfo.outputPath("learning-en-first.png") });
  await expect(page.getByRole("heading", { name: "01 · Request and response", level: 1 })).toBeVisible();
  await expect(page.getByLabel("My prediction")).toHaveValue("캐시 미적중을 먼저 확인한다");
  await page.reload();
  await expect(page.getByLabel("My prediction")).toHaveValue("캐시 미적중을 먼저 확인한다");
  await page.getByRole("button", { name: "Lesson list" }).last().click();
  await page.getByRole("button", { name: "06 · Diagnose and recover" }).click();
  await expect(page.getByText("Services are disconnected. Lessons remain readable; there are no experiment results.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable fault" })).toBeDisabled();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  expect(writes).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("learning-en.png"), fullPage: true });
});

test("local experiment controls require explicit action for all four faults", async ({ page }) => {
  type Session = { id: string; name: string; scenario: string; status: string; createdAt: string; updatedAt: string };
  const sessions: Session[] = [];
  const activations = new Map<string, { enabled: boolean; parameter: number; occurredAt: string }[]>();
  let fault: { sessionId: string; scenario: string; enabled: boolean; parameter: number; expiresAt: string } | null = null;
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
    let data: unknown = {};
    if (path === "/api/overview") data = { services: ["demo-api", "demo-worker", "redis"].map((name) => ({ name, status: "UP" })), metrics: { requestCount: null, errorCount: null, p95Ms: null, kafkaLag: null, cacheHitRate: null }, activeFault: fault };
    else if (path === "/api/sessions" && request.method() === "POST") {
      const body = request.postDataJSON() as { name: string; scenario: string };
      const now = "2026-10-03T00:00:00Z";
      const session = { id: `lesson-${sessions.length}`, name: body.name, scenario: body.scenario, status: "CREATED", createdAt: now, updatedAt: now };
      sessions.push(session);
      data = session;
    } else if (path === "/api/sessions") data = sessions;
    else if (path.endsWith("/fault")) {
      const id = path.split("/")[3];
      const body = request.postDataJSON() as { enabled: boolean; parameter: number };
      const session = sessions.find((entry) => entry.id === id)!;
      activations.set(id, [...(activations.get(id) ?? []), { ...body, occurredAt: "2026-10-03T00:00:00Z" }]);
      fault = body.enabled ? { sessionId: id, scenario: session.scenario, ...body, expiresAt: "2026-10-03T00:15:00Z" } : null;
      data = fault;
    } else if (path.startsWith("/api/sessions/")) {
      const id = path.split("/")[3];
      data = { session: sessions.find((entry) => entry.id === id), activations: activations.get(id) ?? [], evidence: [], report: null, experiments: [] };
    }
    await route.fulfill({ json: data });
  });
  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.mode", "reference"));
  await page.goto("/?view=learn");
  await page.getByRole("button", { name: "06 · 장애 분석과 회복" }).click();
  await expect(page.getByText("로컬 컨트롤 플레인에 연결되었습니다. 실행 전 전체 서비스 상태를 확인하세요.")).toBeVisible();
  await page.getByLabel("언어 선택").selectOption("en");
  expect(writes).toEqual([]);
  for (const scenario of ["Downstream delay", "Inefficient database", "Worker slowdown", "Cache bypass"]) {
    await page.getByRole("button", { name: scenario, exact: true }).click();
    await page.getByRole("button", { name: "Create session for this fault" }).click();
    await expect(page.getByRole("button", { name: "Enable fault" })).toBeEnabled();
    await page.getByRole("button", { name: "Enable fault" }).click();
    await expect(page.getByRole("button", { name: "Disable fault" }).last()).toBeEnabled();
    await page.getByRole("button", { name: "Disable fault" }).last().click();
  }
  expect(writes.filter((request) => request.endsWith("/fault"))).toHaveLength(8);
  expect(sessions).toHaveLength(4);
});

test("embedded mode leaves navigation to the host", async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort("connectionrefused"));
  await page.goto("/?embed=1");
  await expect(page.getByRole("heading", { name: "Java로 배우는 백엔드" })).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".learning-topbar")).toHaveCount(0);
  await page.goto("/?embed=1&view=lab");
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(page.locator(".sidebar")).toBeHidden();
});
