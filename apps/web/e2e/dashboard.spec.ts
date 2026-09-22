import { expect, test } from "@playwright/test";

test("a developer can create a fault session, inspect evidence, and prepare a repeatable experiment", async ({
  page,
}) => {
  // These route fixtures validate browser interactions; they are not benchmark measurements.
  const session = {
    id: "fixture-session",
    name: "Browser contract test",
    scenario: "DOWNSTREAM_LATENCY",
    status: "CREATED",
    createdAt: "2026-09-22T12:00:00Z",
    updatedAt: "2026-09-22T12:00:00Z",
  };
  let created = false;
  let fault: Record<string, unknown> | null = null;
  const evidence: Record<string, unknown>[] = [];
  let report: Record<string, unknown> | null = null;
  const experiments: Record<string, unknown>[] = [];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let data: unknown;
    if (url.pathname === "/api/overview")
      data = {
        services: [{ name: "demo-api", status: "UP" }],
        metrics: {
          requestCount: null,
          errorCount: null,
          p95Ms: null,
          kafkaLag: null,
          cacheHitRate: null,
        },
        activeFault: fault,
      };
    else if (url.pathname === "/api/sessions" && request.method() === "POST") {
      created = true;
      data = session;
    } else if (url.pathname === "/api/sessions")
      data = created ? [session] : [];
    else if (url.pathname.endsWith("/fault")) {
      const command = request.postDataJSON() as {
        enabled: boolean;
        parameter: number;
      };
      fault = command.enabled
        ? {
            sessionId: session.id,
            scenario: session.scenario,
            ...command,
            expiresAt: "2026-09-22T12:30:00Z",
          }
        : null;
      data = fault;
    } else if (url.pathname.endsWith("/evidence")) {
      evidence.push({
        id: "fixture-evidence",
        sessionId: session.id,
        service: "demo-api",
        source: "browser-test-fixture",
        type: "LATENCY_P95",
        value: null,
        unit: "ms",
        windowStart: session.createdAt,
        windowEnd: session.createdAt,
        explanation:
          "Fixture evidence verifies citation navigation, not performance.",
        phase: url.searchParams.get("phase"),
      });
      data = evidence;
    } else if (url.pathname.endsWith("/rca")) {
      report = {
        summary: "Browser test fixture report.",
        suspectedRootCause: "Insufficient measured evidence for a cause.",
        confidence: 0,
        evidenceIds: ["fixture-evidence"],
        impact: "No measured impact asserted.",
        recommendedActions: ["Execute a real experiment."],
        uncertainties: ["This is a UI fixture."],
        provider: "browser-test-fixture",
        generatedAt: session.createdAt,
      };
      data = report;
    } else if (url.pathname.endsWith("/experiments")) {
      const workload = request.postDataJSON();
      experiments.push({
        id: "fixture-experiment",
        sessionId: session.id,
        workload,
        before: null,
        after: null,
        status: "CREATED",
        createdAt: session.createdAt,
      });
      data = experiments[0];
    } else data = { session, evidence, report, experiments, activations: [] };
    await route.fulfill({ json: data });
  });

  await page.goto("/");
  await expect(
    page.getByText("Your first investigation starts here"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open incident lab" }).click();
  await page.getByLabel("Session name").fill(session.name);
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Enable fault" }).click();
  await expect(
    page.getByText("Fault injection is active · Downstream latency"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Evidence & RCA" }).click();
  await page.getByRole("button", { name: "Collect evidence" }).click();
  await expect(
    page.getByText(
      "Fixture evidence verifies citation navigation, not performance.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate RCA" }).click();
  await expect(
    page.getByRole("link", { name: "fixture-evid" }),
  ).toHaveAttribute("href", "#evidence-fixture-evidence");
  await page
    .getByRole("button", { name: "Disable fault", exact: true })
    .click();
  await expect(
    page.getByText("Fault injection is active · Downstream latency"),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Experiments" }).click();
  await page.getByRole("button", { name: "Create experiment" }).click();
  await expect(
    page.getByText(
      /-SessionId fixture-session -ExperimentId fixture-experiment/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Pending", exact: true }),
  ).toHaveCount(20);
  await expect(
    page.getByRole("button", { name: "Create experiment" }),
  ).not.toBeVisible();
  expect(browserErrors).toEqual([]);
  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noHorizontalOverflow).toBe(true);
});

test("the actual empty dashboard remains usable when the control plane is unavailable", async ({
  page,
}, testInfo) => {
  await page.route("**/api/**", (route) => route.abort("connectionrefused"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Understand what changed." }),
  ).toBeVisible();
  await expect(
    page.getByText("Your first investigation starts here"),
  ).toBeVisible();
  await expect(page.getByText("Waiting for telemetry")).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(5);
  if (testInfo.project.name === "desktop") {
    await page.screenshot({
      path: "screenshots/dashboard-empty.png",
      fullPage: true,
    });
  }
});
