import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.MAKA_SITE_URL ?? "http://127.0.0.1:4321";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = "node_modules/axe-core/axe.min.js";
const RESULTS = "test-results/e2e";
const VIEWPORTS = [
  ["phone-320", 320, 568],
  ["phone-390", 390, 844],
  ["tablet", 768, 1024],
  ["laptop", 1280, 720],
  ["desktop", 1440, 900],
  ["wide", 1920, 1080],
];

await mkdir(RESULTS, { recursive: true });
const report = {
  baseUrl: BASE_URL,
  viewports: {},
  axe: {},
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
};

const browser = await chromium.launch({ headless: true, executablePath: CHROME });

for (const [label, width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 768,
    isMobile: width < 768,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push({ viewport: label, text: message.text() });
  });
  page.on("pageerror", (error) => report.pageErrors.push({ viewport: label, text: error.message }));
  page.on("requestfailed", (request) => report.requestFailures.push({
    viewport: label,
    url: request.url(),
    error: request.failure()?.errorText,
  }));

  const response = await page.goto(BASE_URL, { waitUntil: "networkidle" });
  if (!response || response.status() !== 200) throw new Error(`${label}: site did not return 200`);
  await page.waitForFunction(() => document.documentElement.dataset.field === "ready");

  if ((await page.title()) !== "Maka — Your work. Your agent.") throw new Error(`${label}: unexpected title`);
  if ((await page.locator("h1").innerText()).replaceAll("\n", " ") !== "YOUR WORK. YOUR AGENT.") {
    throw new Error(`${label}: unexpected h1`);
  }
  if ((await page.locator("[data-view-panel]").count()) !== 3) throw new Error(`${label}: expected 3 views`);
  if ((await page.locator("img").count()) !== 3) throw new Error(`${label}: expected 3 product images`);
  if ((await page.locator("img:not([alt])").count()) !== 0) throw new Error(`${label}: image missing alt text`);
  if ((await page.locator("a:not([href])").count()) !== 0) throw new Error(`${label}: anchor missing href`);

  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    field: document.documentElement.dataset.field,
    canvas: (() => {
      const element = document.querySelector("#execution-field");
      return element instanceof HTMLCanvasElement ? { width: element.width, height: element.height } : null;
    })(),
  }));
  if (geometry.scrollWidth > geometry.viewport + 1 || geometry.bodyWidth > geometry.viewport + 1) {
    throw new Error(`${label}: horizontal overflow ${JSON.stringify(geometry)}`);
  }
  if (width < 768 && geometry.scrollHeight > height + 1) {
    throw new Error(`${label}: stage is clipped vertically ${JSON.stringify(geometry)}`);
  }
  if (geometry.field !== "ready" || !geometry.canvas?.width || !geometry.canvas.height) {
    throw new Error(`${label}: WebGL field did not initialize ${JSON.stringify(geometry)}`);
  }

  for (const image of await page.locator("img").all()) {
    await image.evaluate((element) => element.complete && element.naturalWidth > 0
      ? true
      : new Promise((resolve, reject) => {
          element.addEventListener("load", () => resolve(true), { once: true });
          element.addEventListener("error", reject, { once: true });
        }));
  }

  await page.keyboard.press("Tab");
  if (!(await page.locator(".skip-link").evaluate((element) => element === document.activeElement))) {
    throw new Error(`${label}: skip link is not first in tab order`);
  }
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());

  for (const [index, view] of ["overview", "product", "runtime"].entries()) {
    await page.locator(`[data-view-target="${view}"]`).first().click();
    await page.waitForFunction((expected) => document.querySelector(".stage")?.getAttribute("data-view") === expected, view);
    if ((await page.locator("[data-view-panel].is-active").count()) !== 1) throw new Error(`${label}: multiple active views`);
    if ((await page.locator(`[data-view-panel="${view}"]`).getAttribute("aria-hidden")) !== "false") {
      throw new Error(`${label}: active view is hidden from accessibility tree`);
    }
    const footerIndex = await page.locator(".stage-status em").innerText();
    if (footerIndex !== `0${index + 1} / 03`) throw new Error(`${label}: footer state mismatch`);
  }

  await page.keyboard.press("ArrowLeft");
  if ((await page.locator(".stage").getAttribute("data-view")) !== "product") throw new Error(`${label}: keyboard view navigation failed`);
  await page.locator('[data-view-target="overview"]').first().click();

  if (width < 768) {
    for (const view of ["overview", "product", "runtime"]) {
      await page.locator(`[data-view-target="${view}"]`).first().click();
      const smallTargets = await page.locator("a").evaluateAll((elements) => elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0
            && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { text: element.getAttribute("aria-label") || element.textContent?.trim(), width: rect.width, height: rect.height };
        })
        .filter((item) => item.width < 44 || item.height < 44));
      if (smallTargets.length) throw new Error(`${label}/${view}: small targets ${JSON.stringify(smallTargets)}`);
    }
    await page.locator('[data-view-target="overview"]').first().click();
  }

  if (label === "phone-320" || label === "desktop") {
    await page.addScriptTag({ path: AXE });
    const violations = await page.evaluate(async () => {
      const result = await globalThis.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
      });
      return result.violations.map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        nodes: nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      }));
    });
    report.axe[label] = violations;
    if (violations.length) throw new Error(`${label}: axe violations ${JSON.stringify(violations)}`);
  }

  report.viewports[label] = geometry;
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${RESULTS}/${label}.png` });
  await context.close();
}

const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
const reducedPage = await reduced.newPage();
await reducedPage.goto(BASE_URL, { waitUntil: "networkidle" });
await reducedPage.waitForFunction(() => document.documentElement.dataset.field === "ready");
if (!(await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))) {
  throw new Error("Reduced-motion media query did not apply");
}
await reducedPage.locator('[data-view-target="runtime"]').first().click();
await reducedPage.screenshot({ path: `${RESULTS}/reduced-motion.png` });
await reduced.close();

const fallback = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await fallback.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    return String(type).startsWith("webgl") ? null : original.call(this, type, ...args);
  };
});
const fallbackPage = await fallback.newPage();
await fallbackPage.goto(BASE_URL, { waitUntil: "networkidle" });
await fallbackPage.waitForFunction(() => document.documentElement.dataset.field === "unavailable");
if (!(await fallbackPage.locator(".execution-field__fallback").isVisible())) throw new Error("Static fallback is not visible");
await fallbackPage.screenshot({ path: `${RESULTS}/webgl-fallback.png` });
await fallback.close();

await browser.close();

if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) {
  throw new Error(`Browser errors: ${JSON.stringify(report, null, 2)}`);
}

await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
