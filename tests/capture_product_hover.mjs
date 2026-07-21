import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.MAKA_SITE_URL ?? "http://127.0.0.1:4321";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RESULTS = "test-results/product-hover";
const VIEWPORT = { width: 1440, height: 900 };
const SAMPLES = [
  { name: "before", phase: "before", waitMs: 0 },
  { name: "enter-120", phase: "enter", waitMs: 120 },
  { name: "enter-420", phase: "enter", waitMs: 420 },
  { name: "leave-120", phase: "leave", waitMs: 120 },
  { name: "leave-420", phase: "leave", waitMs: 420 },
];

await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const report = { baseUrl: BASE_URL, viewport: VIEWPORT, samples: [] };

for (const sample of SAMPLES) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ type: "console", text: message.text() });
  });
  page.on("pageerror", (error) => errors.push({ type: "page", text: error.message }));

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForFunction(() => document.documentElement.dataset.field === "ready");
  await page.locator('[data-view-target="product"]').first().click();
  await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));
  await page.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-renderer") === "webgl2");

  const inspector = page.locator("[data-product-inspector]");
  if (sample.phase === "enter" || sample.phase === "leave") {
    await inspector.hover({ position: { x: 650, y: 220 } });
  }
  if (sample.phase === "leave") {
    await page.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-progress") === "1.000");
    await page.mouse.move(0, 0);
  }
  if (sample.waitMs) await page.waitForTimeout(sample.waitMs);

  const state = await page.locator("#product-hover-field").evaluate((element) => ({
    renderer: element.dataset.renderer,
    state: element.dataset.hoverState,
    progress: Number(element.dataset.progress),
    backing: { width: element.width, height: element.height },
    display: { width: element.clientWidth, height: element.clientHeight },
  }));
  const screenshot = `${RESULTS}/${sample.name}.png`;
  await page.screenshot({ path: screenshot, timeout: 90_000 });
  report.samples.push({ ...sample, ...state, screenshot, errors });
  await context.close();
}

await browser.close();
await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ report: `${RESULTS}/report.json`, samples: report.samples.map(({ name, state, progress }) => ({ name, state, progress })) }, null, 2));
