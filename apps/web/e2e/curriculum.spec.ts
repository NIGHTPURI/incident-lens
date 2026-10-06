import { languageStages } from "../src/learning/language-depth-data";
import { chapters } from "../src/learning/curriculum";
import { expect, test } from "@playwright/test";

test("bilingual foundation tabs persist evidence without claiming mastery", async ({ page }, testInfo) => {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });
  await page.addInitScript(() => localStorage.setItem("incidentlens.learning.platform.v1", "linux"));
  await page.goto("/?view=learn");
  await expect(page.getByRole("heading", { name: "Java로 배우는 백엔드" })).toBeVisible();
  await page.getByRole("button", { name: "학습하기" }).click();
  await page.getByRole("tab", { name: "개념", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "예제" })).toBeFocused();
  await expect(page.getByText("cat examples/beginner/product.txt", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("foundations-ko-example.png"), fullPage: true });
  await page.getByRole("tab", { name: "흐름과 메모", exact: true }).click();
  await page.getByLabel("내 예측 · 메모").fill("파일은 그대로 남는다");
  await page.getByRole("tab", { name: "실습" }).click();
  await page.getByRole("tab", { name: "자기 확인", exact: true }).click();
  await page.getByLabel("내 실행·검증 기록").fill("아직 실행하지 않음");
  await page.getByLabel("언어 선택").selectOption("en");
  await page.getByRole("tab", { name: "Self-review", exact: true }).click();
  await expect(page.getByLabel("My execution and verification record")).toHaveValue("아직 실행하지 않음");
  await page.getByRole("button", { name: "Next lesson" }).click();
  await expect(page.getByRole("heading", { name: "02 · Language basics and errors", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous lesson" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByRole("tab", { name: "Self-review", exact: true }).click();
  await expect(page.getByLabel("My execution and verification record")).toHaveValue("아직 실행하지 않음");
  await page.reload();
  await page.getByRole("tab", { name: "Flow & notes", exact: true }).click();
  await expect(page.getByLabel("My prediction · notes")).toHaveValue("파일은 그대로 남는다");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("foundations-en-flow.png"), fullPage: true });
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("incidentlens.learning.track.java.v2")!));
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
  await page.goto("/?view=learn");
  for (const locale of ["ko", "en"] as const) {
    await page.locator(".language-select").selectOption(locale);
    if (locale === "ko") await page.getByRole("button", { name: "학습하기" }).click();
    else {
      if (await page.locator(".curriculum-menu-toggle").isVisible()) await page.locator(".curriculum-menu-toggle").click();
      await page.locator(".curriculum-lesson-title").first().click();
    }
    for (const [index, chapter] of chapters.entries()) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(languageStages[index][locale === "ko" ? 1 : 2]);
      if (chapter.scope) await expect(page.getByTestId("chapter-scope")).toContainText(chapter.scope[locale]);
      await page.getByRole("tab", { name: locale === "ko" ? "예제" : "Examples", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.run);
      await page.getByRole("tab", { name: locale === "ko" ? "오류 해결" : "Troubleshooting", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.failure[locale]);
      await page.getByRole("tab", { name: locale === "ko" ? "실습" : "Practice", exact: true }).click();
      await expect(page.locator("#curriculum-panel")).toContainText(chapter.criteria[locale]);
      if (index < chapters.length - 1) await page.getByRole("button", { name: locale === "ko" ? "다음 학습" : "Next lesson", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: locale === "ko" ? "다음 학습" : "Next lesson", exact: true })).toBeDisabled();
  }
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("incidentlens.learning.track.java.v2")!).read)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
