import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RESULTS = "test-results/initial-load";
const TIMESTAMPS = [0, 120, 280, 520, 900, 1500, 2400, 3600, 5200];
const SITES = [
  ["reference", process.env.REFERENCE_URL ?? "https://haoqi.design/"],
  ["maka", process.env.MAKA_SITE_URL ?? "http://127.0.0.1:4322/"],
];
const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["phone-390", 390, 844],
];
const SITE_FILTER = process.env.CAPTURE_SITE;
const VIEWPORT_FILTER = process.env.CAPTURE_VIEWPORT;

await mkdir(RESULTS, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--disable-background-networking"],
});
const report = {
  timestamps: TIMESTAMPS,
  sites: {},
};

const readState = (timestamp) => {
  const summarize = (selector) => {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      opacity: Number.parseFloat(style.opacity),
      visibility: style.visibility,
      transform: style.transform,
      rect: [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value)),
    };
  };

  return {
    timestamp,
    documentMs: performance.now(),
    readyState: document.readyState,
    field: document.documentElement?.dataset.field ?? null,
    bodyTextLength: document.body?.innerText.length ?? 0,
    bodyBackground: document.body ? getComputedStyle(document.body).backgroundColor : null,
    canvas: [...document.querySelectorAll("canvas")].map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        id: element.id || null,
        width: element.width,
        height: element.height,
        opacity: Number.parseFloat(style.opacity),
        visibility: style.visibility,
        rect: [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value)),
      };
    }),
    owners: {
      header: summarize("header > *"),
      footer: summarize("footer > *"),
      main: summarize("main"),
      heroCopy: summarize(".hero-copy"),
      overviewNotes: summarize(".overview-note"),
      objectIndex: summarize(".object-index"),
    },
  };
};

for (const [site, url] of SITES) {
  if (SITE_FILTER && site !== SITE_FILTER) continue;
  report.sites[site] = { url, viewports: {} };
  for (const [viewport, width, height] of VIEWPORTS) {
    if (VIEWPORT_FILTER && viewport !== VIEWPORT_FILTER) continue;
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    const frames = [];
    for (const timestamp of TIMESTAMPS) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        hasTouch: width < 768,
        isMobile: width < 768,
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push({ timestamp, text: message.text() });
      });
      page.on("pageerror", (error) => pageErrors.push({ timestamp, text: error.message }));
      page.on("requestfailed", (request) => requestFailures.push({
        timestamp,
        url: request.url(),
        error: request.failure()?.errorText,
      }));

      await page.goto(url, { waitUntil: "commit", timeout: 90_000 });
      const committedAt = performance.now();
      if (timestamp) await page.waitForTimeout(timestamp);
      const state = await page.evaluate(readState, timestamp);
      const sinceCommitMs = performance.now() - committedAt;
      const path = `${RESULTS}/${site}-${viewport}-${String(timestamp).padStart(4, "0")}.png`;
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await writeFile(path, Buffer.from(screenshot.data, "base64"));
      frames.push({ ...state, sinceCommitMs, path });
      await context.close();
    }

    report.sites[site].viewports[viewport] = {
      viewport: { width, height, dpr: 1 },
      frames,
      consoleErrors,
      pageErrors,
      requestFailures,
    };
  }
}

await browser.close();
await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ report: `${RESULTS}/report.json`, timestamps: TIMESTAMPS }, null, 2));
