import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Browser-only fixtures exercise presentation. These values are not benchmark results.
const session = {
  id: "localization-session",
  name: "Localization browser fixture · 한국어 이름",
  scenario: "DOWNSTREAM_LATENCY",
  status: "CREATED",
  createdAt: "2026-09-22T12:00:00Z",
  updatedAt: "2026-09-22T12:05:00Z",
};
const evidence = {
  id: "localization-evidence",
  sessionId: session.id,
  service: "demo-api",
  source: "browser-test-fixture",
  type: "LATENCY_P95",
  value: 1200,
  unit: "ms",
  windowStart: session.createdAt,
  windowEnd: session.updatedAt,
  explanation: "Raw API evidence remains unchanged across locales.",
  traceId: "0123456789abcdef0123456789abcdef",
  phase: "BEFORE",
};
const report = {
  summary: "Raw API report remains unchanged across locales.",
  suspectedRootCause: "A browser fixture is not measured root-cause evidence.",
  confidence: 0,
  evidenceIds: [evidence.id],
  impact: "No measured production impact asserted.",
  recommendedActions: ["Execute a real experiment to measure impact."],
  uncertainties: ["These values only exercise localized presentation."],
  provider: "browser-test-fixture",
  generatedAt: session.updatedAt,
};
const metrics = {
  requestCount: 1234,
  errorCount: 4,
  throughput: 61.7,
  successRate: 1230 / 1234,
  p50Ms: 150,
  p95Ms: 1200,
  p99Ms: 1400,
  dbQueryP95Ms: 23.4,
  kafkaLag: 12,
  cacheHitRate: 0.75,
};
const experiment = {
  id: "localization-experiment",
  sessionId: session.id,
  workload: { vus: 2, durationSeconds: 20 },
  before: metrics,
  after: { ...metrics, p50Ms: 30, p95Ms: 60, p99Ms: 90, kafkaLag: 0 },
  status: "COMPLETE",
  createdAt: session.createdAt,
};

async function mockPopulatedApi(context: BrowserContext) {
  const mutations: string[] = [];
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET")
      mutations.push(`${request.method()} ${request.url()}`);
    const path = new URL(request.url()).pathname;
    const data =
      path === "/api/overview"
        ? {
            services: [
              { name: "demo-api", status: "UP" },
              { name: "demo-worker", status: "UP" },
              { name: "redis", status: "UP" },
            ],
            metrics,
            activeFault: {
              sessionId: session.id,
              scenario: session.scenario,
              enabled: true,
              parameter: 1200,
              expiresAt: "2026-09-22T12:30:00Z",
            },
          }
        : path === "/api/sessions"
          ? [session]
          : {
              session,
              evidence: [evidence],
              report,
              experiments: [experiment],
              activations: [
                {
                  enabled: true,
                  parameter: 1200,
                  occurredAt: session.createdAt,
                },
                {
                  enabled: false,
                  parameter: 1200,
                  occurredAt: session.updatedAt,
                },
              ],
            };
    await route.fulfill({ json: data });
  });
  return mutations;
}

async function expectContainedLayout(page: Page) {
  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const clipped = [
      ...document.querySelectorAll<HTMLElement>(
        ".stat, .scenario-card, .evidence-card, .status, .tag, button",
      ),
    ]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => `${element.className}: ${element.textContent?.trim()}`);
    const scrollingContainers = [
      ...document.querySelectorAll<HTMLElement>(".sidebar nav, .table-scroll"),
    ].filter((element) => element.scrollWidth > element.clientWidth + 1);
    return {
      documentOverflow: document.documentElement.scrollWidth > viewport,
      clipped,
      inaccessibleOverflow: scrollingContainers.filter((element) => {
        const style = getComputedStyle(element);
        return (
          !["auto", "scroll"].includes(style.overflowX) ||
          element.getBoundingClientRect().width > viewport
        );
      }).length,
    };
  });
  expect(layout.documentOverflow).toBe(false);
  expect(layout.clipped).toEqual([]);
  // Narrow tables and the existing mobile navigation may scroll inside their own bounds.
  expect(layout.inaccessibleOverflow).toBe(0);
}

async function captureView(page: Page, path: string) {
  // Full-page capture otherwise places the fixed sidebar at the previous scroll offset.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}

test("Korean default and English switching localize every populated view and persist after reload and revisit", async ({
  page,
  context,
}, testInfo) => {
  // This case renders and captures eight views, then verifies two reloads and a new tab.
  test.setTimeout(60_000);
  const mutations = await mockPopulatedApi(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=overview");
  await expect(page.getByLabel("언어 선택")).toHaveValue("ko");
  await expect(page.getByLabel("언어 선택").locator("option")).toHaveText([
    "한국어",
    "English",
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page).toHaveTitle("IncidentLens · 백엔드 학습실");
  await expect(
    page.getByRole("heading", {
      name: "장애 전후에 무엇이 달라졌는지 확인하세요.",
    }),
  ).toBeVisible();

  for (const locale of ["ko", "en"] as const) {
    if (locale === "en") {
      await page.getByLabel("언어 선택").selectOption("en");
      await expect(
        page.getByRole("heading", { name: "Measure the recovery." }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Incident session", { exact: true }),
      ).toHaveValue(session.id);
    }
    const korean = locale === "ko";
    const nav = page.locator("nav");
    await nav
      .getByRole("button", { name: korean ? "개요" : "Overview", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: korean ? "서비스 연결 상태" : "Service connectivity",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(korean ? "요청 수" : "Request count", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: korean ? "상세 보기 →" : "Inspect →",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".fault-banner")).toContainText(
      korean ? "다운스트림 지연" : "Downstream latency",
    );
    await expectContainedLayout(page);
    await captureView(page, testInfo.outputPath(`${locale}-overview.png`));

    await nav
      .getByRole("button", {
        name: korean ? "자유실험실" : "Free experiment lab",
        exact: true,
      })
      .click();
    await expect(page.locator(".scenario-card")).toHaveCount(4);
    await expect(
      page
        .locator(".scenario-card")
        .filter({ hasText: korean ? "다운스트림 지연" : "Downstream latency" }),
    ).toBeVisible();
    await expect(
      page.locator(".scenario-card").filter({
        hasText: korean ? "데이터베이스 성능 저하" : "Database degradation",
      }),
    ).toBeVisible();
    await expect(
      page.locator(".scenario-card").filter({
        hasText: korean ? "Kafka 컨슈머 지연" : "Consumer slowdown",
      }),
    ).toBeVisible();
    await expect(
      page
        .locator(".scenario-card")
        .filter({ hasText: korean ? "캐시 성능 저하" : "Cache degradation" }),
    ).toBeVisible();
    expect(
      await page
        .locator('input[name="scenario"]')
        .evaluateAll((elements) =>
          elements.map((item) => (item as HTMLInputElement).value),
        ),
    ).toEqual([
      "DOWNSTREAM_LATENCY",
      "DATABASE_DEGRADATION",
      "KAFKA_SLOWDOWN",
      "CACHE_DEGRADATION",
    ]);
    await expect(
      page.getByLabel(korean ? "세션 이름" : "Session name"),
    ).toBeVisible();
    await expectContainedLayout(page);
    await captureView(page, testInfo.outputPath(`${locale}-lab.png`));

    await nav
      .getByRole("button", {
        name: korean ? "증거 및 RCA" : "Evidence & RCA",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(korean ? "관측된 증거" : "OBSERVED EVIDENCE", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: korean ? "권장 조치" : "Recommended actions",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: korean ? "불확실성" : "Uncertainties",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".hypothesis .eyebrow")).toHaveText(
      korean ? "근본 원인 가설 · 추론" : "ROOT CAUSE HYPOTHESIS · INFERENCE",
    );
    if (testInfo.project.name === "mobile") {
      const hypothesisText = await page
        .locator(".hypothesis > div")
        .first()
        .boundingBox();
      const confidence = await page.locator(".confidence").boundingBox();
      expect(hypothesisText).not.toBeNull();
      expect(confidence).not.toBeNull();
      // Long API hypotheses need the card width; confidence must not squeeze them into a narrow column.
      expect(hypothesisText!.width).toBeGreaterThanOrEqual(240);
      expect(confidence!.y).toBeGreaterThanOrEqual(
        hypothesisText!.y + hypothesisText!.height - 1,
      );
    }
    await expect(page.locator(".timeline")).toContainText(
      korean ? "장애 비활성화" : "Fault disabled",
    );
    await expect(
      page.getByText(evidence.explanation, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(report.summary, { exact: true })).toBeVisible();
    await expect(
      page.getByText(evidence.traceId, { exact: true }),
    ).toBeVisible();
    await page.locator('a[href="#rca-report"]').click();
    await expect(page.locator("#rca-report")).toBeInViewport();
    await page.locator('a[href="#observed-evidence"]').click();
    await expect(page.locator("#observed-evidence")).toBeInViewport();
    const citation = page.locator(`[href="#evidence-${evidence.id}"]`);
    await expect(citation).toHaveCount(1);
    await citation.click();
    await expect(page.locator(`#evidence-${evidence.id}`)).toBeVisible();
    const phaseSelect = page.locator(".phase-select select");
    expect(
      await phaseSelect
        .locator("option")
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
    ).toEqual(["BEFORE", "AFTER"]);
    await expectContainedLayout(page);
    await captureView(page, testInfo.outputPath(`${locale}-evidence-rca.png`));

    await nav
      .getByRole("button", {
        name: korean ? "실험 비교" : "Experiments",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("cell", {
        name: korean ? "DB 조회 p95" : "DB lookup p95",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", {
        name: korean ? /변경 전.*장애 상태/ : /BEFORE.*fault active/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", {
        name: korean ? /복구 후.*장애 비활성화/ : /AFTER.*fault disabled/,
      }),
    ).toBeVisible();
    await expect(page.locator(".comparison-table tbody tr")).toHaveCount(10);
    await expect(page.locator(".comparison-table .delta-label")).toHaveCount(
      10,
    );
    await expect(
      page
        .locator(".comparison-table tbody tr")
        .filter({
          hasText: korean ? "p95 요청 지연시간" : "p95 request latency",
        })
        .locator(".delta-label"),
    ).toHaveText(korean ? "개선 방향" : "Improved direction");
    const comparisonRegion = page
      .locator(".table-scroll")
      .filter({ has: page.locator(".comparison-table") });
    await expect(comparisonRegion).toHaveAttribute("role", "region");
    await expect(comparisonRegion).toHaveAttribute("tabindex", "0");
    await expect(comparisonRegion).not.toHaveAccessibleName("");
    if (
      await comparisonRegion.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      )
    ) {
      await comparisonRegion.focus();
      await comparisonRegion.press("ArrowRight");
      await expect
        .poll(() => comparisonRegion.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
    }
    await expect(
      page.locator(".status").filter({ hasText: korean ? "완료" : "complete" }),
    ).toBeVisible();
    await expectContainedLayout(page);
    await captureView(page, testInfo.outputPath(`${locale}-comparison.png`));
  }

  await expect(page.getByLabel("Select language")).toHaveValue("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("IncidentLens · Backend Learning");
  expect(
    await page.evaluate(() => localStorage.getItem("incidentlens.locale")),
  ).toBe("en");
  // Navigation now persists the current route in the URL; choose overview explicitly.
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Understand what changed." }),
  ).toBeVisible();
  await expect(page.getByLabel("Select language")).toHaveValue("en");
  const revisited = await context.newPage();
  await revisited.goto("/?view=overview");
  await expect(revisited.getByLabel("Select language")).toHaveValue("en");
  await expect(
    revisited.getByRole("heading", { name: "Understand what changed." }),
  ).toBeVisible();
  await revisited.close();
  await page.getByLabel("Select language").selectOption("ko");
  await page.reload();
  await expect(page.getByLabel("언어 선택")).toHaveValue("ko");
  await expect(
    page.getByRole("heading", {
      name: "장애 전후에 무엇이 달라졌는지 확인하세요.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("incidentlens.locale")),
  ).toBe("ko");
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("offline errors and empty states render in Korean and switch to English without invented telemetry", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => route.abort("connectionrefused"));
  await page.goto("/?view=overview");
  await expect(page.getByRole("alert")).toContainText(
    "요청을 완료하지 못했습니다.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "컨트롤 플레인에 연결할 수 없습니다.",
  );
  await expect(page.getByText("확인 불가", { exact: true })).toHaveCount(5);
  await expect(
    page.getByText("첫 장애 분석을 시작하세요", { exact: true }),
  ).toBeVisible();
  await expectContainedLayout(page);
  await page
    .locator("nav")
    .getByRole("button", { name: "자유실험실", exact: true })
    .click();
  await expect(
    page.getByText("세션을 만들어 시작하세요", { exact: true }),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "증거 및 RCA", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "장애 세션을 선택하세요", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "증거 수집", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "RCA 생성", exact: true }),
  ).toBeDisabled();
  await page
    .locator("nav")
    .getByRole("button", { name: "실험 비교", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "장애 세션을 선택하세요", exact: true }),
  ).toBeVisible();
  await page.getByLabel("언어 선택").selectOption("en");
  await expect(page.getByRole("alert")).toContainText(
    "Request could not be completed.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Unable to reach the control plane.",
  );
  await expect(
    page.getByRole("heading", {
      name: "Select an incident session",
      exact: true,
    }),
  ).toBeVisible();
  await expectContainedLayout(page);
});
