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

// Only existing observations are read. No traffic, faults, or experiment records are created.
async function read(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `Live GET ${path} must succeed`);
  return response.json();
}
const detail = await read(`/api/sessions/${sessionId}`);
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
const inspected = [];
const overviewSnapshots = [];
async function inspectText(page) {
  return page.evaluate(() => {
    const luminance = (color) => {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((value) => value / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    return [
      ".stat-detail",
      ".telemetry-scope",
      ".service > div > span",
      ".eyebrow",
      ".last-updated",
      ".status.good",
      ".page-footer",
      ".evidence-card dt",
      ".timeline time",
      ".report-summary",
      ".confidence span",
      ".uncertainties > p",
      ".comparison-table th",
      ".delta-label",
    ].flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [];
      const style = getComputedStyle(element);
      let ancestor = element;
      let background = "rgb(255, 255, 255)";
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        if (candidate !== "transparent" && !candidate.endsWith(", 0)")) {
          background = candidate;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      const foreground = luminance(style.color);
      const surrounding = luminance(background);
      return [
        {
          selector,
          fontSize: style.fontSize,
          color: style.color,
          background,
          contrastRatio: Number(
            (
              (Math.max(foreground, surrounding) + 0.05) /
              (Math.min(foreground, surrounding) + 0.05)
            ).toFixed(2),
          ),
        },
      ];
    });
  });
}
const locales = {
  en: {
    overview: "Overview",
    evidence: "Evidence & RCA",
    comparison: "Experiments",
    session: "Incident session",
    db: "DB lookup p95",
  },
  ko: {
    overview: "개요",
    evidence: "증거 및 RCA",
    comparison: "실험 비교",
    session: "장애 세션",
    db: "DB 조회 p95",
  },
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30_000);
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
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  for (const variant of [
    { locale: "en", device: "desktop", width: 1440, height: 900 },
    { locale: "ko", device: "desktop", width: 1440, height: 900 },
    { locale: "en", device: "mobile", width: 390, height: 844 },
    { locale: "ko", device: "mobile", width: 390, height: 844 },
  ]) {
    const copy = locales[variant.locale];
    await page.setViewportSize({
      width: variant.width,
      height: variant.height,
    });
    await page.locator(".language-select").selectOption(variant.locale);
    assert.equal(
      await page.locator("html").getAttribute("lang"),
      variant.locale,
    );
    const navigate = (name) =>
      page.locator("nav").getByRole("button", { name, exact: true }).click();
    async function capture(view, locator = page) {
      const name =
        variant.device === "desktop"
          ? `${variant.locale === "en" ? "" : "ko-"}${view}-live`
          : `${variant.locale}-${view}-mobile`;
      const path = `screenshots/${name}.png`;
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        true,
        `No document overflow on ${name}`,
      );
      if (locator === page) {
        await page.screenshot({ path, fullPage: true });
      } else {
        // Document clipping avoids centering a tall panel and accidentally including
        // fixed controls that are outside the actual viewport (for example the skip link).
        const clip = await locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
        });
        await page.screenshot({ path, fullPage: true, clip });
      }
      captured.push(path);
      inspected.push({
        path,
        view,
        locale: variant.locale,
        viewport: { width: variant.width, height: variant.height },
        capturedAt: new Date().toISOString(),
        documentOverflow: false,
        textInspection: await inspectText(page),
      });
    }

    await navigate(copy.overview);
    await page.locator(".services").waitFor();
    assert.equal(
      await page.getByRole("alert").count(),
      0,
      "Live overview must not show an API failure",
    );
    overviewSnapshots.push({
      locale: variant.locale,
      device: variant.device,
      observedAt: new Date().toISOString(),
      data: await read("/api/overview"),
    });
    await capture("overview");

    await navigate(copy.evidence);
    await page
      .getByLabel(copy.session, { exact: true })
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
        "Each citation must resolve to observed evidence",
      );
    }
    if (detail.report.evidenceIds.length) {
      await page
        .locator(`[href="#evidence-${detail.report.evidenceIds[0]}"]`)
        .click();
    }
    if (variant.device === "desktop" && variant.locale === "en")
      await capture("evidence");
    await capture("rca", page.locator(".rca-panel"));

    await navigate(copy.comparison);
    await page.getByRole("cell", { name: copy.db, exact: true }).waitFor();
    assert.equal(await page.locator(".comparison-table tbody tr").count(), 10);
    await capture("comparison");
  }

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
  const afterCapture = await read(`/api/sessions/${sessionId}`);
  const stored = afterCapture.experiments.find(
    (item) => item.id === experiment.id,
  );
  assert.deepEqual(
    stored.before,
    experiment.before,
    "Existing BEFORE measurements must remain unchanged",
  );
  assert.deepEqual(
    stored.after,
    experiment.after,
    "Existing AFTER measurements must remain unchanged",
  );
  const manifest = {
    capturedAt: new Date().toISOString(),
    source: baseUrl,
    frontendAssets: await page
      .locator('script[src], link[rel="stylesheet"][href]')
      .evaluateAll((assets) =>
        assets.map(
          (asset) => asset.getAttribute("src") ?? asset.getAttribute("href"),
        ),
      ),
    locales: ["ko", "en"],
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
    captures: inspected,
    overviewSnapshots,
    browserErrors: errors,
    apiMutations: writes,
    mobileDocumentOverflow: false,
    mobileCheckedViews: ["overview", "evidence", "rca", "comparison"],
    note: "Real local API observations; no route mocks or synthetic benchmark values. Overview snapshots are current retained telemetry and can be empty after restart. Comparison values belong to the identified completed experiment and are verified unchanged after capture. Korean UI preserves raw API narratives and technical identifiers.",
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
        screenshotCount: captured.length,
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
