import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const sessionId = process.argv[3];
if (!sessionId || !/^[a-f0-9-]{36}$/.test(sessionId)) {
  throw new Error(
    "Usage: node scripts/capture-live.mjs <dashboard URL> <completed session UUID>",
  );
}

// Capture existing observations only. This script never creates traffic, faults, or experiment records.
const response = await fetch(`${baseUrl}/api/sessions/${sessionId}`);
assert.equal(
  response.status,
  200,
  "The live session must be accessible through the dashboard proxy",
);
const detail = await response.json();
const experiment = detail.experiments.find(
  (item) => item.status === "COMPLETE",
);
assert.ok(
  experiment,
  "Capture requires a completed experiment with real BEFORE and AFTER results",
);
assert.ok(detail.report, "Capture requires an existing RCA report");

await mkdir("screenshots", { recursive: true });
const browser = await chromium.launch();
const errors = [];
const writes = [];
const captured = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1150 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      request.method() !== "GET"
    ) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  async function capture(name, locator = page) {
    const path = `screenshots/${name}.png`;
    if (locator === page) await page.evaluate(() => window.scrollTo(0, 0));
    const noOverflow = await page.evaluate(
      (width) => document.documentElement.scrollWidth <= width,
      page.viewportSize().width,
    );
    assert.equal(
      noOverflow,
      true,
      `No horizontal document overflow on ${name}`,
    );
    await locator.screenshot({
      path,
      ...(locator === page ? { fullPage: true } : {}),
    });
    captured.push(path);
  }

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "Recent incident sessions" })
    .waitFor();
  assert.equal(
    await page.getByRole("alert").count(),
    0,
    "Live overview must not show an API failure",
  );
  await capture("overview-live");

  await page.getByRole("button", { name: "Evidence & RCA" }).click();
  await page
    .getByLabel("Incident session", { exact: true })
    .selectOption(sessionId);
  await page.getByText(detail.report.summary, { exact: true }).waitFor();
  assert.ok((await page.locator(".evidence-card").count()) > 0);
  for (const id of detail.report.evidenceIds) {
    assert.equal(
      await page.locator(`[href="#evidence-${id}"]`).count(),
      1,
      "Each RCA citation must be linked",
    );
    assert.equal(
      await page.locator(`[id="evidence-${id}"]`).count(),
      1,
      "Each linked citation must resolve to observed evidence",
    );
  }
  if (detail.report.evidenceIds.length) {
    await page
      .locator(`[href="#evidence-${detail.report.evidenceIds[0]}"]`)
      .click();
  }
  await capture("evidence-live");
  await capture("rca-live", page.locator(".rca-panel"));

  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page
    .getByRole("heading", { name: `Experiment ${experiment.id.slice(0, 8)}` })
    .waitFor();
  await page
    .getByRole("cell", { name: "DB lookup p95", exact: true })
    .waitFor();
  await capture("comparison-live");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      (width) => document.documentElement.scrollWidth <= width,
      page.viewportSize().width,
    ),
    true,
    "Mobile comparison has no horizontal document overflow",
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  assert.equal(
    await page.evaluate((width) => document.documentElement.scrollWidth <= width, page.viewportSize().width),
    true,
    "Populated mobile overview has no horizontal document overflow",
  );

  assert.deepEqual(
    writes,
    [],
    "Screenshot capture must not mutate the backend",
  );
  assert.deepEqual(
    errors,
    [],
    "Live UI must not produce browser console errors",
  );
  const manifest = {
    capturedAt: new Date().toISOString(),
    source: baseUrl,
    sessionId,
    experimentId: experiment.id,
    scenario: detail.session.scenario,
    workload: experiment.workload,
    before: experiment.before,
    after: experiment.after,
    evidenceCount: detail.evidence.length,
    reportProvider: detail.report.provider,
    citedEvidenceIds: detail.report.evidenceIds,
    screenshots: captured,
    browserErrors: errors,
    apiMutations: writes,
    mobileDocumentOverflow: false,
    mobileCheckedViews: ["overview", "comparison"],
    note: "Real local API observations; no route mocks or synthetic benchmark values. Overview is aggregate telemetry at capture time; comparison belongs to the identified completed session.",
  };
  await writeFile(
    "screenshots/live-capture.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        sessionId,
        experimentId: experiment.id,
        screenshots: captured,
        browserErrors: errors,
        apiMutations: writes,
        mobileDocumentOverflow: false,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
