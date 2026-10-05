import { expect, test } from "@playwright/test";
import { chapters } from "../src/learning/curriculum";
import { chapterForPlatform, platformKey } from "../src/learning/platform";

test("OS choice is keyboard accessible and preserves bilingual progress and old experiment records", async ({ page }) => {
  const writes: string[] = [];
  await page.addInitScript(() => {
    if (!localStorage.getItem("os-test-seeded")) {
      localStorage.setItem("os-test-seeded", "1");
      localStorage.setItem("incidentlens.curriculum.v1", JSON.stringify({ version: 1, stage: "http", read: ["tools"], notes: { http: "my prediction" }, evidence: { http: "my independent result" } }));
      localStorage.setItem("incidentlens.learning.prediction.outbox", "legacy prediction");
      localStorage.setItem("incidentlens.learning.platform.v1", "linux");
    }
  });
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "이어서 학습" }).click();
  const originalProgress = await page.evaluate(() => localStorage.getItem("incidentlens.curriculum.v1"));
  await page.getByRole("tab", { name: "최소 예제" }).click();
  const selector = page.getByLabel("학습 OS / 셸");
  await selector.focus(); await page.keyboard.press("Home"); await page.keyboard.press("Enter");
  await expect(selector).toHaveValue("windows");
  await expect(page.locator("#curriculum-panel")).toContainText("curl.exe -i");
  await expect(page.locator("#curriculum-panel")).toContainText("Get-NetTCPConnection");
  await page.getByLabel("언어 선택").selectOption("en");
  await expect(page.getByLabel("Learning OS / shell")).toHaveValue("windows");
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(page.getByLabel("My prediction")).toHaveValue("my prediction");
  await page.getByRole("tab", { name: "Independent practice" }).click();
  await expect(page.getByLabel("My execution and verification record")).toHaveValue("my independent result");
  await page.reload();
  await expect(page.getByLabel("Learning OS / shell")).toHaveValue("windows");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(chapters[2].title.en);
  await page.getByLabel("Learning OS / shell").selectOption("linux");
  await page.getByRole("tab", { name: "Minimal example" }).click();
  await expect(page.locator("#curriculum-panel")).toContainText('curl -i');
  expect(await page.evaluate(() => localStorage.getItem("incidentlens.curriculum.v1"))).toBe(originalProgress);
  expect(await page.evaluate(() => localStorage.getItem("incidentlens.learning.prediction.outbox"))).toBe("legacy prediction");
  expect(await page.evaluate(() => localStorage.getItem("incidentlens.learning.platform.v1"))).toBe("linux");
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("all fifteen chapters expose their actual Windows and Linux variants in both languages", async ({ page }) => {
  test.setTimeout(120_000);
  await page.route("**/api/**", route => route.abort("connectionrefused"));
  await page.goto("/");
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  for (const platform of ["windows", "linux"] as const) {
    await page.locator("#learning-platform").selectOption(platform);
    for (const locale of ["ko", "en"] as const) {
      await page.locator(".language-select").selectOption(locale);
      if (platform !== "windows" || locale !== "ko") {
        if (await page.locator(".curriculum-menu-toggle").isVisible()) await page.locator(".curriculum-menu-toggle").click();
        await page.locator(".curriculum-lesson-link").first().click();
      }
      for (const [index, original] of chapters.entries()) {
        const chapter = chapterForPlatform(original, platform);
        await page.getByRole("tab", { name: locale === "ko" ? "최소 예제" : "Minimal example", exact: true }).click();
        await expect(page.locator("#curriculum-panel")).toContainText(chapter.run);
        await page.getByRole("tab", { name: locale === "ko" ? "문제 해결" : "Troubleshooting", exact: true }).click();
        await expect(page.locator("#curriculum-panel")).toContainText(chapter.failure[locale]);
        await expect(page.locator("#learning-platform")).toHaveValue(platform);
        if (index < 14) await page.getByRole("button", { name: locale === "ko" ? "다음 학습" : "Next lesson", exact: true }).click();
      }
    }
  }
  expect(await page.evaluate(key => localStorage.getItem(key), platformKey)).toBe("linux");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
