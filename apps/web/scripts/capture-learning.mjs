import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "screenshots");
const url = process.env.INCIDENTLENS_CAPTURE_URL ?? "http://127.0.0.1:4174/";
const browser = await chromium.launch();
const captures = [];
try {
  for (const locale of ["ko", "en"]) {
    for (const size of ["desktop", "mobile"]) {
      const viewport = size === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      await context.addInitScript((language) => localStorage.setItem("incidentlens.locale", language), locale);
      const page = await context.newPage();
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      await page.goto(url, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: locale === "ko" ? "첫 학습 시작" : "Start first lesson" }).click();
      await page.evaluate(() => document.fonts.ready);
      const file = `learning-${locale}-${size}.png`;
      await page.screenshot({ path: path.join(output, file) });
      if (failures.length) throw new Error(failures.join("; "));
      captures.push({ locale, size, file, viewport });
      await context.close();
    }
  }
  await writeFile(path.join(output, "learning-capture.json"), JSON.stringify({
    capturedAt: new Date().toISOString(),
    source: "Local Vite app and local control-plane proxy. Lesson screen; no benchmark measurements.",
    captures,
  }, null, 2) + "\n");
} finally {
  await browser.close();
}
