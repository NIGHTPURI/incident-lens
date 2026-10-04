import { chapters } from "../src/learning/curriculum";
import { expect, test } from "@playwright/test";

test("bilingual foundation tabs persist evidence without claiming mastery", async ({ page }, testInfo) => {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });
  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.platform.v1", "linux"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "백엔드 학습 목록" })).toBeVisible();
  await page.getByRole("button", { name: "첫 학습 시작" }).click();
  await page.getByRole("tab", { name: "개념", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "최소 예제" })).toBeFocused();
  await expect(page.getByText("cat examples/beginner/product.txt", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("foundations-ko-example.png"), fullPage: true });
  await page.getByRole("tab", { name: "흐름", exact: true }).click();
  await page.getByLabel("내 예측").fill("파일은 그대로 남는다");
  await page.getByRole("tab", { name: "혼자 풀기" }).click();
  await page.getByLabel("내 실행·검증 기록").fill("아직 실행하지 않음");
  await page.getByLabel("언어 선택").selectOption("en");
  await expect(page.getByLabel("My execution and verification record")).toHaveValue("아직 실행하지 않음");
  await page.getByRole("button", { name: "Next lesson" }).click();
  await expect(page.getByRole("heading", { name: "02 · Small calculations in Java", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous lesson" }).click();
  await page.getByRole("tab", { name: "Independent practice" }).click();
  await expect(page.getByLabel("My execution and verification record")).toHaveValue("아직 실행하지 않음");
  await page.reload();
  await page.getByRole("tab", { name: "Flow", exact: true }).click();
  await expect(page.getByLabel("My prediction")).toHaveValue("파일은 그대로 남는다");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("foundations-en-flow.png"), fullPage: true });
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("incidentlens.curriculum.v1")!));
  expect(progress.read).toEqual([]);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("all fifteen stages expose bilingual lessons, scope, examples and independent work", async ({ page }) => {
  test.setTimeout(90_000);
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });
  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.platform.v1", "linux"));
  await page.goto("/");
  for (const locale of ["ko", "en"] as const) {
    await page.locator(".language-select").selectOption(locale);
    if (locale === "ko") await page.getByRole("button", { name: "첫 학습 시작" }).click();
    else {
      await page.locator(".curriculum-toolbar").getByRole("button", { name: "Lesson list", exact: true }).click();
      await page.locator(".curriculum-roadmap button").first().click();
    }
    for (const [index, chapter] of chapters.entries()) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(chapter.title[locale]);
      if (chapter.scope) await expect(page.getByTestId("chapter-scope")).toContainText(chapter.scope[locale]);
      await page.getByRole("tab", { name: locale === "ko" ? "최소 예제" : "Minimal example", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.run);
      await page.getByRole("tab", { name: locale === "ko" ? "문제 해결" : "Troubleshooting", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.failure[locale]);
      await page.getByRole("tab", { name: locale === "ko" ? "혼자 풀기" : "Independent practice", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.criteria[locale]);
      if (index < chapters.length - 1) await page.getByRole("button", { name: locale === "ko" ? "다음 학습" : "Next lesson", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: locale === "ko" ? "다음 학습" : "Next lesson", exact: true })).toBeDisabled();
  }
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("incidentlens.curriculum.v1")!).read)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
