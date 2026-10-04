import { expect, test, type Page } from "@playwright/test";

async function offline(page: Page) {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    await route.abort("connectionrefused");
  });
  return writes;
}
async function openContents(page: Page) {
  if (await page.locator(".curriculum-menu-toggle").isVisible()) await page.locator(".curriculum-menu-toggle").click();
}
async function openTech(page: Page, name: string) {
  await openContents(page);
  await page.locator(".curriculum-area-switch button").nth(1).click();
  await page.locator(".curriculum-tech-tree .curriculum-lesson-link").filter({ hasText: name }).click();
}

test("programming language, OS, UI locale and theme persist independently without changing Java progress", async ({ page }) => {
  const writes = await offline(page);
  await page.goto("/");
  const initialProgress = await page.evaluate(() => localStorage.getItem("incidentlens.curriculum.v1"));
  await page.locator("#learning-code-language").selectOption("python");
  await page.locator("#learning-platform").selectOption("windows");
  await page.locator(".language-select").selectOption("en");
  await page.locator(".theme-select").selectOption("dark");
  await expect(page.locator(".programming-guide h1")).toHaveText("Python");
  await expect(page.locator(".language-course-chapter")).toHaveCount(5);
  await expect(page.locator("#track-setup").locator("..")).toContainText("python.exe -m venv .venv");
  await expect(page.locator(".curriculum-sidebar-progress")).toContainText("no completion record");
  await page.reload();
  await expect(page.locator("#learning-code-language")).toHaveValue("python");
  await expect(page.locator("#learning-platform")).toHaveValue("windows");
  await expect(page.locator(".language-select")).toHaveValue("en");
  await expect(page.locator(".theme-select")).toHaveValue("dark");
  await page.locator("#learning-platform").selectOption("linux");
  await expect(page.locator("#track-setup").locator("..")).toContainText("python3 -m venv .venv");
  await page.locator("#learning-code-language").selectOption("java");
  await expect(page.locator(".curriculum-lesson-link")).toHaveCount(15);
  expect(await page.evaluate(() => localStorage.getItem("incidentlens.curriculum.v1"))).toBe(initialProgress);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("all fourteen guides and focused language courses expose real headings, source links and honest scope", async ({ page }) => {
  const writes = await offline(page);
  await page.goto("/");
  await page.locator(".language-select").selectOption("en");
  for (const language of ["python", "javascript", "go", "csharp"] as const) {
    await page.locator("#learning-code-language").selectOption(language);
    await expect(page.locator(".language-course-chapter")).toHaveCount(5);
    for (const id of ["api", "db", "auth", "tests", "deployment"]) {
      await expect(page.locator(`#track-${id}`)).toHaveCount(1);
    }
    await expect(page.locator(".programming-guide")).toContainText("not run or verified projects");
  }
  await openTech(page, "Prometheus");
  await expect(page.locator(".curriculum-tech-tree .curriculum-lesson-link")).toHaveCount(14);
  await expect(page.locator(".technology-guide")).toContainText("stores numeric time series");
  await expect(page.locator(".technology-guide")).toContainText("Optional profile");
  await openTech(page, "Grafana");
  await expect(page.locator(".technology-guide")).toContainText("does not collect or store");
  await openTech(page, "Apache Kafka");
  await expect(page.locator(".technology-guide")).toContainText("exactly-once");
  for (const id of ["need", "flow", "example", "lab", "failure", "practice"]) {
    await expect(page.locator(`#tech-${id}`)).toHaveCount(1);
  }
  await expect(page.locator(".technology-guide a[href^='https://']")).toHaveCount(1);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("stage and technology links return to the same Java lesson, and mobile contents have a keyboard exit", async ({ page }) => {
  const writes = await offline(page);
  await page.goto("/");
  await page.locator(".language-select").selectOption("en");
  await openContents(page);
  await page.locator(".curriculum-lesson-link").filter({ hasText: "12 · Performance and Redis" }).click();
  await expect(page.locator(".learning-main h1")).toHaveText("12 · Performance and Redis");
  await page.locator(".curriculum-technology-links button").filter({ hasText: "Redis" }).click();
  await expect(page.locator(".technology-guide h1")).toHaveText("Redis");
  await page.locator(".technology-guide button").filter({ hasText: "Open related Java lesson" }).click();
  await expect(page.locator(".learning-main h1")).toHaveText("12 · Performance and Redis");
  await expect(page.locator("#learning-code-language")).toHaveValue("java");
  if (await page.locator(".curriculum-menu-toggle").isVisible()) {
    await page.locator(".curriculum-menu-toggle").click();
    await expect(page.locator(".curriculum-sidebar")).toHaveAttribute("role", "dialog");
    await expect(page.locator(".curriculum-menu-close")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(".curriculum-sidebar")).not.toHaveAttribute("role", "dialog");
    await expect(page.locator(".curriculum-menu-toggle")).toBeFocused();
  }
  expect(writes).toEqual([]);
});
