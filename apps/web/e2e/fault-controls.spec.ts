import { expect, test } from "@playwright/test";

test("local experiment controls require explicit action for all four faults", async ({ page }) => {
  type Session = { id: string; name: string; scenario: string; status: string; createdAt: string; updatedAt: string };
  const sessions: Session[] = [];
  const activations = new Map<string, { enabled: boolean; parameter: number; occurredAt: string }[]>();
  let fault: { sessionId: string; scenario: string; enabled: boolean; parameter: number; expiresAt: string } | null = null;
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
    let data: unknown = {};
    if (path === "/api/overview") data = { services: ["demo-api", "demo-worker", "redis"].map((name) => ({ name, status: "UP" })), metrics: { requestCount: null, errorCount: null, p95Ms: null, kafkaLag: null, cacheHitRate: null }, activeFault: fault };
    else if (path === "/api/sessions" && request.method() === "POST") {
      const body = request.postDataJSON() as { name: string; scenario: string };
      const now = "2026-10-03T00:00:00Z";
      const session = { id: `lesson-${sessions.length}`, name: body.name, scenario: body.scenario, status: "CREATED", createdAt: now, updatedAt: now };
      sessions.push(session);
      data = session;
    } else if (path === "/api/sessions") data = sessions;
    else if (path.endsWith("/fault")) {
      const id = path.split("/")[3];
      const body = request.postDataJSON() as { enabled: boolean; parameter: number };
      const session = sessions.find((entry) => entry.id === id)!;
      activations.set(id, [...(activations.get(id) ?? []), { ...body, occurredAt: "2026-10-03T00:00:00Z" }]);
      fault = body.enabled ? { sessionId: id, scenario: session.scenario, ...body, expiresAt: "2026-10-03T00:15:00Z" } : null;
      data = fault;
    } else if (path.startsWith("/api/sessions/")) {
      const id = path.split("/")[3];
      data = { session: sessions.find((entry) => entry.id === id), activations: activations.get(id) ?? [], evidence: [], report: null, experiments: [] };
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/?view=lab");await page.locator(".language-select").selectOption("en");
  expect(writes).toEqual([]);
  for (const scenario of ["DOWNSTREAM_LATENCY", "DATABASE_DEGRADATION", "KAFKA_SLOWDOWN", "CACHE_DEGRADATION"]) {
    await page.locator(`input[value="${scenario}"]`).check();
    await page.getByRole("button", { name: "Create session" }).click();
    await expect(page.getByRole("button", { name: "Enable fault" })).toBeEnabled();
    await page.getByRole("button", { name: "Enable fault" }).click();
    await expect(page.getByRole("button", { name: "Disable fault" }).last()).toBeEnabled();
    await page.getByRole("button", { name: "Disable fault" }).last().click();
  }
  expect(writes.filter((request) => request.endsWith("/fault"))).toHaveLength(8);
  expect(sessions).toHaveLength(4);
});

