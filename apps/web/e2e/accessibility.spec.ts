import { expect, test, type Locator } from "@playwright/test";

async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    let ancestor: Element | null = element.parentElement;
    let background = "rgb(255, 255, 255)";
    while (ancestor) {
      const candidate = getComputedStyle(ancestor).backgroundColor;
      if (candidate !== "transparent" && !candidate.endsWith(", 0)")) {
        background = candidate;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const luminance = (color: string) => {
      const channels = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((channel) => channel / 255)
        .map((channel) =>
          channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4,
        );
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(style.outlineColor);
    const surrounding = luminance(background);
    return {
      visible: element.matches(":focus-visible"),
      width: parseFloat(style.outlineWidth),
      contrast:
        (Math.max(foreground, surrounding) + 0.05) /
        (Math.min(foreground, surrounding) + 0.05),
    };
  });
  expect(focus.visible).toBe(true);
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.contrast).toBeGreaterThanOrEqual(3);
}

test("keyboard navigation has visible focus and service health remains readable without color", async ({
  page,
}) => {
  test.setTimeout(60_000);
  // These status values test accessible UI semantics, not live service availability.
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      json:
        new URL(route.request().url()).pathname === "/api/overview"
          ? {
              services: [
                { name: "demo-api", status: "UP" },
                { name: "demo-worker", status: "DOWN" },
                { name: "redis", status: "UNKNOWN" },
              ],
              metrics: {
                requestCount: 30,
                errorCount: 2,
                p95Ms: 120,
                kafkaLag: 0,
                cacheHitRate: 0.5,
              },
              activeFault: null,
            }
          : [],
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "서비스 연결 상태" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expectVisibleFocus(skip);

  // Walk the actual tab order through the dark sidebar and the language control.
  const reached = new Set<string>();
  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press("Tab");
    const active = page.locator(":focus");
    await expectVisibleFocus(active);
    const kind = await active.evaluate((element) =>
      element.matches(".nav-item")
        ? `nav:${element.textContent?.trim()}`
        : element.matches(".language-select")
          ? "language"
          : "other",
    );
    reached.add(kind);
    if (kind === "language") break;
  }
  expect([...reached].filter((item) => item.startsWith("nav:"))).toHaveLength(
    4,
  );
  expect(reached.has("language")).toBe(true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Select language")).toHaveValue("en");
  expect(
    await page.evaluate(() => localStorage.getItem("incidentlens.locale")),
  ).toBe("en");

  for (const [service, status] of [
    ["demo-api", "up"],
    ["demo-worker", "down"],
    ["redis", "unknown"],
  ]) {
    const row = page.locator(".service").filter({ hasText: service });
    await expect(row.locator(".status-label")).toHaveText(status);
    await expect(row.locator(".status-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  }
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Shift+Tab");
    if (await skip.evaluate((element) => element === document.activeElement))
      break;
  }
  await expectVisibleFocus(skip);
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const evidenceNavigation = page
    .locator("nav")
    .getByRole("button", { name: "Evidence & RCA", exact: true });
  await evidenceNavigation.focus();
  await evidenceNavigation.press("Enter");
  await expect(evidenceNavigation).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Follow the evidence." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Collect evidence", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
