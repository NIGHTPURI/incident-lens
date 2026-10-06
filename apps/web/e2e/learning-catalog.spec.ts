import { expect, test, type Page } from "@playwright/test";
import { languageStages } from "../src/learning/language-depth-data";
async function contents(page: Page) {
  if (await page.locator(".curriculum-menu-toggle").isVisible()) await page.locator(".curriculum-menu-toggle").click();
}
test("all four languages use introductions, common contents and authored lessons without navigation writes", async ({ page }) => {
  test.setTimeout(180_000);
  const writes: string[] = [];
  await page.route("**/api/**", async route => { if (route.request().method() !== "GET") writes.push(route.request().url()); await route.abort(); });
  await page.goto("/?view=learn");
  await page.locator(".language-select").selectOption("en");
  let titles: string[] | undefined;
  for (const language of ["java", "python", "javascript", "csharp"]) {
    await page.locator("#learning-code-language").selectOption(language);
    await expect(page.locator(".track-introduction")).toBeVisible();
    await expect(page.locator(".track-lesson")).toHaveCount(0);
    await contents(page);
    const current = await page.locator(".curriculum-lesson-title").allTextContents();
    expect(current).toHaveLength(15); if (titles) expect(current).toEqual(titles); titles = current;
    await page.locator(".curriculum-lesson-title").first().click();
    for (const [index, stage] of languageStages.entries()) {
      await expect(page.locator(".track-lesson h1")).toHaveText(stage[2]);
      await expect(page.locator(".curriculum-tabs button")).toHaveCount(6);
      await page.getByRole("tab", { name: "Examples", exact: true }).click();
      await expect(page.locator("#curriculum-panel pre").first()).not.toBeEmpty();
      await page.getByRole("tab", { name: "Practice", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Guided practice", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Observable criteria", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Troubleshooting", exact: true }).click();
      await expect(page.locator("#curriculum-panel .lesson-prose").first()).not.toBeEmpty();
      if (index < 14) await page.getByRole("button", { name: "Next lesson", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: "Next lesson", exact: true })).toBeDisabled();
    await contents(page);
    await page.locator(".curriculum-area-switch button").nth(1).click();
    await contents(page);
    await expect(page.locator(".curriculum-tech-tree .curriculum-lesson-link")).toHaveCount(14);
    await page.locator(".curriculum-tech-tree button").filter({ hasText: "Redis" }).click();
    await expect(page.locator(".technology-guide")).toContainText("MySQL");
    await page.locator(".technology-guide button").filter({ hasText: "Open related" }).click();
    await expect(page.locator("#learning-code-language")).toHaveValue(language);
    await expect(page.locator(".track-lesson h1")).toHaveText(languageStages[11][2]);
    if (await page.locator(".curriculum-menu-toggle").isVisible()) {
      await contents(page); await expect(page.locator(".curriculum-menu-close")).toBeFocused();
      await page.keyboard.press("Shift+Tab"); await expect(page.locator(".curriculum-brand")).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator(".curriculum-sidebar button").last()).toBeFocused();
      await page.keyboard.press("Escape"); await expect(page.locator(".curriculum-menu-toggle")).toBeFocused();
    }
  }
  expect(writes).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
