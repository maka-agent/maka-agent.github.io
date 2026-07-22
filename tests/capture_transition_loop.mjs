import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.MAKA_SITE_URL ?? "http://127.0.0.1:4321";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RESULTS = "test-results/transition-loop";
const TIMESTAMPS = [0, 120, 400, 900, 1300, 1900];
const SCREENSHOT_TIMESTAMPS = [0, 400, 1900];
const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["phone-390", 390, 844],
];
const TRANSITIONS = [
  ["overview", "product"],
  ["product", "runtime"],
  ["runtime", "surfaces"],
  ["surfaces", "overview"],
];

await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const report = { baseUrl: BASE_URL, timestamps: TIMESTAMPS, screenshotTimestamps: SCREENSHOT_TIMESTAMPS, viewports: {} };

const openSettledPage = async (width, height, from) => {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 768, isMobile: width < 768 });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}#${from}`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForFunction(() => document.documentElement.dataset.field === "ready");
  await page.waitForFunction((view) => document.querySelector(".stage")?.dataset.view === view, from);
  await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));
  return { context, page };
};

const collectComputedTimeline = (page, to) => page.evaluate(({ target, timestamps }) => {
  const readState = (timestamp, startedAt) => {
    const numeric = (selector, property) => {
      const element = document.querySelector(selector);
      return element ? Number.parseFloat(getComputedStyle(element)[property]) : null;
    };
    const style = (selector, property) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element)[property] : null;
    };
    const stage = document.querySelector(".stage");
    return {
      timestamp,
      actualMs: performance.now() - startedAt,
      view: stage?.dataset.view,
      entering: stage?.dataset.entering ?? null,
      transitioning: stage?.dataset.transitioning ?? null,
      sceneState: document.querySelector("#execution-field")?.dataset.sceneState ?? null,
      panels: Object.fromEntries([...document.querySelectorAll("[data-view-panel]")].map((panel) => [
        panel.dataset.viewPanel,
        { opacity: Number.parseFloat(getComputedStyle(panel).opacity), visibility: getComputedStyle(panel).visibility },
      ])),
      owners: {
        overview: {
          heroOpacity: numeric(".hero-copy", "opacity"),
          heroTransform: style(".hero-copy", "transform"),
        },
        product: {
          proofOpacity: numeric(".product-shot--main", "opacity"),
          proofClip: style(".product-shot--main", "clipPath"),
          proofFilter: style(".product-shot--main", "filter"),
          copyOpacity: numeric(".product-copy", "opacity"),
        },
        runtime: {
          copyOpacity: numeric(".runtime-copy", "opacity"),
          hubOpacity: numeric("[data-runtime-hub]", "opacity"),
          hubTransform: style("[data-runtime-hub]", "transform"),
          stageOpacity: numeric("[data-runtime-path]", "opacity"),
          ledgerOpacity: numeric("[data-runtime-statement]", "opacity"),
        },
        surfaces: {
          statementOpacity: numeric(".surfaces-statement", "opacity"),
          desktopOpacity: numeric(".surface-projection--desktop", "opacity"),
          tuiOpacity: numeric(".surface-projection--tui", "opacity"),
          closeOpacity: numeric(".surfaces-close", "opacity"),
        },
      },
    };
  };

  const startedAt = performance.now();
  document.querySelector(`[data-view-target="${target}"]`)?.click();
  return Promise.all(timestamps.map((timestamp) => new Promise((resolve) => {
    window.setTimeout(() => resolve(readState(timestamp, startedAt)), timestamp);
  })));
}, { target: to, timestamps: TIMESTAMPS });

for (const [label, width, height] of VIEWPORTS) {
  report.viewports[label] = {};
  for (const [from, to] of TRANSITIONS) {
    const measurementRun = await openSettledPage(width, height, from);
    const samples = await collectComputedTimeline(measurementRun.page, to);
    await measurementRun.context.close();

    const screenshots = [];
    for (const timestamp of SCREENSHOT_TIMESTAMPS) {
      const visualRun = await openSettledPage(width, height, from);
      await visualRun.page.evaluate((target) => {
        window.__makaTransitionCaptureStartedAt = performance.now();
        document.querySelector(`[data-view-target="${target}"]`)?.click();
      }, to);
      if (timestamp) await visualRun.page.waitForTimeout(timestamp);
      const actualMs = await visualRun.page.evaluate(() => performance.now() - window.__makaTransitionCaptureStartedAt);
      const path = `${RESULTS}/${label}-${from}-to-${to}-${String(timestamp).padStart(4, "0")}.png`;
      await visualRun.page.screenshot({ path });
      screenshots.push({ timestamp, actualMs, path });
      await visualRun.context.close();
    }

    report.viewports[label][`${from}-to-${to}`] = { samples, screenshots };
  }
}

await browser.close();
await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ baseUrl: BASE_URL, report: `${RESULTS}/report.json`, viewports: Object.keys(report.viewports) }, null, 2));
