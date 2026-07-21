import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.MAKA_SITE_URL ?? "http://127.0.0.1:4321";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE = "node_modules/axe-core/axe.min.js";
const RESULTS = "test-results/e2e";
const NAVIGATION_TIMEOUT = 90_000;
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

  const response = await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
  if (!response || response.status() !== 200) throw new Error(`${label}: site did not return 200`);
  await page.waitForFunction(() => document.documentElement.dataset.field === "ready");

  if ((await page.title()) !== "Maka — Your work. Your agent.") throw new Error(`${label}: unexpected title`);
  const heroText = (await page.locator("#hero-title").innerText())
    .replaceAll("\n", " ")
    .replaceAll(" ", " ");
  if (heroText !== "YOUR WORK. YOUR AGENT.") throw new Error(`${label}: unexpected h1 "${heroText}"`);
  if ((await page.locator("[data-section]").count()) !== 6) throw new Error(`${label}: expected 6 sections`);
  if ((await page.locator("main img").count()) !== 3) throw new Error(`${label}: expected 3 product images`);
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
  if (geometry.scrollHeight < height * 3) {
    throw new Error(`${label}: page is unexpectedly short ${JSON.stringify(geometry)}`);
  }
  if (geometry.field !== "ready" || !geometry.canvas?.width || !geometry.canvas.height) {
    throw new Error(`${label}: WebGL field did not initialize ${JSON.stringify(geometry)}`);
  }

  await page.keyboard.press("Tab");
  if (!(await page.locator(".skip-link").evaluate((element) => element === document.activeElement))) {
    throw new Error(`${label}: skip link is not first in tab order`);
  }
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());

  /* Nav click scrolls to the WORK section and telemetry follows. */
  await page.locator('.shell-nav [data-nav="work"]').click();
  await page.waitForFunction(() => {
    const work = document.querySelector("#work");
    return work && Math.abs(work.getBoundingClientRect().top) < innerHeight * 0.5;
  }, undefined, { timeout: 10_000 });
  await page.waitForFunction(
    () => document.querySelector("#section-label")?.textContent?.includes("WORK"),
    undefined,
    { timeout: 10_000 },
  );

  /* Keyboard command R jumps to Runtime. */
  await page.keyboard.press("r");
  await page.waitForFunction(() => {
    const runtime = document.querySelector("#runtime");
    return runtime && Math.abs(runtime.getBoundingClientRect().top) < innerHeight * 0.5;
  }, undefined, { timeout: 10_000 });

  /* The statement fill is scroll-driven. */
  await page.evaluate(() => document.getElementById("statement")?.scrollIntoView({ behavior: "auto", block: "center" }));
  await page.waitForTimeout(400);
  const fill = await page.evaluate(() => Number.parseFloat(
    document.getElementById("statement")?.style.getPropertyValue("--fill") || "0",
  ));
  if (!(fill > 0)) throw new Error(`${label}: statement fill did not advance (${fill})`);

  /* All proof imagery (including lazy frames passed during the scroll journey)
     must decode successfully. */
  for (const image of await page.locator("main img").all()) {
    await image.evaluate((element) => {
      element.scrollIntoView({ behavior: "auto", block: "center" });
      if (element.complete && element.naturalWidth > 0) return true;
      return Promise.race([
        new Promise((resolve, reject) => {
          element.addEventListener("load", () => resolve(true), { once: true });
          element.addEventListener("error", () => reject(new Error("image failed")), { once: true });
        }),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error("image load timeout")), 20000)),
      ]);
    });
  }

  if (width < 768) {
    const smallTargets = await page.locator("a").evaluateAll((elements) => elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.getAttribute("aria-label") || element.textContent?.trim(), width: rect.width, height: rect.height };
      })
      .filter((item) => item.width < 44 || item.height < 44));
    if (smallTargets.length) throw new Error(`${label}: small touch targets ${JSON.stringify(smallTargets)}`);
  }

  if (label === "phone-320" || label === "desktop") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
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

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${RESULTS}/${label}.png` });
  await context.close();
}

/* Reduced motion: page settles without continuous animation. */
const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
const reducedPage = await reduced.newPage();
await reducedPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
await reducedPage.waitForFunction(() => document.documentElement.dataset.field === "ready");
if (!(await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))) {
  throw new Error("Reduced-motion media query did not apply");
}
const reducedFill = await reducedPage.evaluate(() => getComputedStyle(document.getElementById("statement")).backgroundImage);
if (!reducedFill.includes("linear-gradient")) throw new Error("Reduced motion: statement styling missing");
await reducedPage.evaluate(() => document.querySelector("#runtime")?.scrollIntoView({ behavior: "auto" }));
await reducedPage.waitForTimeout(500);
await reducedPage.screenshot({ path: `${RESULTS}/reduced-motion.png` });
await reduced.close();

/* WebGL unavailable: semantic story and CSS sky remain. */
const fallback = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await fallback.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    return String(type).startsWith("webgl") ? null : original.call(this, type, ...args);
  };
});
const fallbackPage = await fallback.newPage();
await fallbackPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
await fallbackPage.waitForFunction(() => document.documentElement.dataset.field === "unavailable");
if (!(await fallbackPage.locator("#hero-title").isVisible())) throw new Error("Hero is hidden without WebGL");
if (!(await fallbackPage.locator(".execution-field").isVisible())) throw new Error("CSS sky fallback is not visible");
await fallbackPage.screenshot({ path: `${RESULTS}/webgl-fallback.png` });
await fallback.close();

/* Renderer chunk blocked: the document still tells the whole story. */
const noRenderer = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await noRenderer.route(/execution[-_]?field/i, (route) => route.abort());
const noRendererPage = await noRenderer.newPage();
await noRendererPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
if (!(await noRendererPage.locator("#hero-title").isVisible())) throw new Error("Core hero is hidden while renderer code is unavailable");
if ((await noRendererPage.locator("main img").count()) !== 3) throw new Error("Product proof is missing while renderer code is unavailable");
await noRendererPage.screenshot({ path: `${RESULTS}/renderer-blocked.png` });
await noRenderer.close();

await browser.close();

if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) {
  throw new Error(`Browser errors: ${JSON.stringify(report, null, 2)}`);
}

await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
