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
  await page.waitForFunction(() => document.documentElement.dataset.boot === "complete");
  if (await page.locator(".boot-loader").isVisible()) throw new Error(`${label}: boot loader still owns the settled stage`);
  if (!(await page.locator(".hero-copy").isVisible())) throw new Error(`${label}: hero copy did not complete the initial ownership sequence`);

  if ((await page.title()) !== "Maka — Your work. Your agent.") throw new Error(`${label}: unexpected title`);
  const commandHints = await page.locator(".view-nav small").allTextContents();
  if (JSON.stringify(commandHints) !== JSON.stringify(["[1]", "[2]", "[3]"])) throw new Error(`${label}: navigation command hints are incomplete`);
  if ((await page.locator("#overview-title").innerText()).replaceAll("\n", " ") !== "YOUR WORK. YOUR AGENT.") {
    throw new Error(`${label}: unexpected h1`);
  }
  if ((await page.locator("[data-view-panel]").count()) !== 3) throw new Error(`${label}: expected 3 views`);
  if ((await page.locator("img").count()) !== 3) throw new Error(`${label}: expected 3 product images`);
  if ((await page.locator(".product-proof img").count()) !== 2) throw new Error(`${label}: trust proofs are incomplete`);
  if ((await page.locator(".product-detail, .product-callout").count()) !== 0) throw new Error(`${label}: duplicate Product overlays remain`);
  const runtimePhases = await page.locator("[data-runtime-phase]").evaluateAll((elements) => elements.map((element) => element.dataset.runtimePhase));
  if (JSON.stringify(runtimePhases) !== JSON.stringify(["request", "agent-run", "event-log", "projection", "recovery"])) {
    throw new Error(`${label}: Runtime event order is incorrect ${JSON.stringify(runtimePhases)}`);
  }
  if ((await page.locator("[data-runtime-hub]").count()) !== 1) throw new Error(`${label}: Runtime needs one dominant Event Log hub`);
  if ((await page.locator(".runtime-map, .runtime-code").count()) !== 0) throw new Error(`${label}: legacy Runtime collage remains`);
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
  if ((await page.locator("#execution-field").getAttribute("data-wordmark")) !== "Maka") {
    throw new Error(`${label}: hero renderer is not bound to the Maka wordmark`);
  }
  if ((await page.locator("#execution-field").getAttribute("data-wordmark-geometry")) !== "original-tube-strokes") {
    throw new Error(`${label}: hero wordmark regressed to a generic or anonymous geometry`);
  }
  const expectedCenter = `${String(Math.round(width / 2)).padStart(4, "0")}X${String(Math.round(height / 2)).padStart(4, "0")}Y`;
  const initialPointer = (await page.locator(".pointer-readout").textContent() ?? "").replaceAll("\n", " ").replaceAll(/\s+/g, " ").trim();
  if (initialPointer !== expectedCenter) throw new Error(`${label}: pointer telemetry is not initialized from the viewport center (${initialPointer})`);
  if (width < 768 && await page.locator(".pointer-readout").isVisible()) throw new Error(`${label}: pointer-only telemetry competes with the touch layout`);
  if (label === "desktop" && !(await page.locator(".pointer-readout").isVisible())) throw new Error("desktop: pointer telemetry is not visible");
  const productHoverField = page.locator("#product-hover-field");
  if (width < 768) {
    if ((await productHoverField.getAttribute("data-hover-state")) !== "disabled") throw new Error(`${label}: Product hover GPU work is not disabled for coarse pointers`);
  } else {
    await page.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-renderer") === "webgl2");
    const hoverBacking = await productHoverField.evaluate((element) => ({ width: element.width, height: element.height }));
    if (!hoverBacking.width || !hoverBacking.height) throw new Error(`${label}: Product hover field has no backing surface`);
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

  if (label === "desktop") {
    await page.goto(new URL("#overview", BASE_URL).href, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
    await page.waitForFunction(() => document.documentElement.dataset.field === "ready" && scrollY === 0);

    const productLifecycle = await page.locator('.view-nav [data-view-target="product"]').evaluate((element) => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      const stage = document.querySelector(".stage");
      return {
        transitioning: stage?.getAttribute("data-transitioning"),
        duration: stage?.getAttribute("data-transition-duration"),
      };
    });
    if (productLifecycle.transitioning !== "overview-to-product") {
      throw new Error(`desktop: missing Product transition lifecycle marker (${JSON.stringify(productLifecycle)})`);
    }
    if (productLifecycle.duration !== "1450") {
      throw new Error(`desktop: Product readiness marker does not cover the full proof stagger (${JSON.stringify(productLifecycle)})`);
    }
    const productTransitionConfig = await page.locator(".product-shot--main").evaluate((element) => {
      const style = getComputedStyle(element);
      return { property: style.transitionProperty, duration: style.transitionDuration };
    });
    if (!productTransitionConfig.property.includes("clip-path") || !productTransitionConfig.property.includes("filter") || productTransitionConfig.duration.split(",").every((value) => value.trim() === "0s")) {
      throw new Error(`desktop: Product transition CSS is inactive ${JSON.stringify(productTransitionConfig)}`);
    }
    await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));
    const productFinalState = await page.locator(".product-shot--main").evaluate((element) => {
      const style = getComputedStyle(element);
      return { opacity: Number(style.opacity), clipPath: style.clipPath, filter: style.filter };
    });
    if (productFinalState.opacity !== 1 || productFinalState.clipPath !== "inset(0px)" || productFinalState.filter !== "none") {
      throw new Error(`desktop: Product transition did not settle ${JSON.stringify(productFinalState)}`);
    }
    await page.screenshot({ path: `${RESULTS}/desktop-product-before-hover.png`, timeout: NAVIGATION_TIMEOUT });
    await page.locator("[data-product-inspector]").hover({ position: { x: 650, y: 220 } });
    await page.waitForFunction(() => Number(document.querySelector("#product-hover-field")?.getAttribute("data-progress")) >= 0.999);
    const hoverState = await productHoverField.evaluate((element) => ({
      renderer: element.dataset.renderer,
      state: element.dataset.hoverState,
      progress: element.dataset.progress,
      backing: { width: element.width, height: element.height },
      display: { width: element.clientWidth, height: element.clientHeight },
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    }));
    if (hoverState.renderer !== "webgl2" || hoverState.state !== "active" || hoverState.progress !== "1.000"
      || Math.abs(hoverState.backing.width / hoverState.dpr - hoverState.display.width) > 2
      || Math.abs(hoverState.backing.height / hoverState.dpr - hoverState.display.height) > 2) {
      throw new Error(`desktop: Product hover field did not reach a sharp settled state ${JSON.stringify(hoverState)}`);
    }
    await page.screenshot({ path: `${RESULTS}/desktop-product-hover.png`, timeout: NAVIGATION_TIMEOUT });
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-hover-state") === "idle");
    const productHierarchy = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      const main = rect(".product-shot--main");
      const proofs = [...document.querySelectorAll(".product-proof")].map((element) => element.getBoundingClientRect());
      return { main, proofs, viewport: { width: innerWidth, height: innerHeight } };
    });
    if (!productHierarchy.main
      || productHierarchy.main.width / productHierarchy.viewport.width < 0.62
      || productHierarchy.main.width / productHierarchy.viewport.width > 0.68
      || productHierarchy.main.height / productHierarchy.viewport.height < 0.45
      || productHierarchy.main.height / productHierarchy.viewport.height > 0.62
      || productHierarchy.main.x / productHierarchy.viewport.width < 0.33
      || productHierarchy.main.x / productHierarchy.viewport.width > 0.37) {
      throw new Error(`desktop: dominant Product proof lost its reference-led ownership ${JSON.stringify(productHierarchy)}`);
    }
    if (productHierarchy.proofs.length !== 2 || Math.abs(productHierarchy.proofs[0].width - productHierarchy.proofs[1].width) > 2 || productHierarchy.proofs.some((proof) => proof.y / productHierarchy.viewport.height < 0.7)) {
      throw new Error(`desktop: next Product proofs lost equal lower-edge pacing ${JSON.stringify(productHierarchy)}`);
    }
    await page.locator('.view-nav [data-view-target="overview"]').click();
    await page.waitForFunction(() => document.querySelector(".stage")?.getAttribute("data-view") === "overview");
    await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));

    await page.mouse.move(123, 36);
    await page.waitForFunction(() => document.querySelector("#execution-field")?.getAttribute("data-cursor-state") === "suppressed");
    await page.mouse.move(123, 456);
    await page.waitForFunction(() => document.querySelector(".pointer-readout")?.textContent?.replaceAll(/\s+/g, "").trim() === "0123X0456Y");
    const pointerBus = await page.evaluate(() => ({
      stage: document.querySelector(".stage")?.getAttribute("data-pointer"),
      x: document.querySelector("#execution-field")?.getAttribute("data-pointer-x"),
      y: document.querySelector("#execution-field")?.getAttribute("data-pointer-y"),
      cursor: document.querySelector("#execution-field")?.getAttribute("data-cursor-state"),
      lightTransform: getComputedStyle(document.querySelector(".light-field")).transform,
    }));
    if (pointerBus.stage !== "engaged" || pointerBus.x !== "123" || pointerBus.y !== "456" || pointerBus.cursor !== "active" || pointerBus.lightTransform === "none") {
      throw new Error(`desktop: DOM, light field, and WebGL do not share one pointer source ${JSON.stringify(pointerBus)}`);
    }

    await page.keyboard.press("2");
    await page.waitForFunction(() => document.querySelector(".stage")?.getAttribute("data-view") === "product");
    await page.keyboard.press("1");
    await page.waitForFunction(() => document.querySelector(".stage")?.getAttribute("data-view") === "overview");
    await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));
  }

  const expectedTransitionDurations = { overview: "900", product: "1450", runtime: "1900" };
  for (const [index, view] of ["overview", "product", "runtime"].entries()) {
    const lifecycle = await page.locator(`[data-view-target="${view}"]`).first().evaluate((element) => {
      const stage = document.querySelector(".stage");
      const outgoing = stage?.getAttribute("data-view");
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return {
        outgoing,
        current: stage?.getAttribute("data-view"),
        transitioning: stage?.getAttribute("data-transitioning"),
        duration: stage?.getAttribute("data-transition-duration"),
      };
    });
    await page.waitForFunction((expected) => document.querySelector(".stage")?.getAttribute("data-view") === expected, view);
    if (lifecycle.outgoing !== view) {
      if (lifecycle.current !== view || lifecycle.transitioning !== `${lifecycle.outgoing}-to-${view}` || lifecycle.duration !== expectedTransitionDurations[view]) {
        throw new Error(`${label}/${view}: incomplete transition lifecycle ${JSON.stringify(lifecycle)}`);
      }
      await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));
      if (await page.locator(".stage").getAttribute("data-transition-duration")) {
        throw new Error(`${label}/${view}: stale transition duration marker`);
      }
    }
    if ((await page.locator("[data-view-panel].is-active").count()) !== 1) throw new Error(`${label}: multiple active views`);
    if ((await page.locator(`[data-view-panel="${view}"]`).getAttribute("aria-hidden")) !== "false") {
      throw new Error(`${label}: active view is hidden from accessibility tree`);
    }
    const footerIndex = await page.locator(".stage-status em").innerText();
    if (footerIndex !== `0${index + 1} / 03`) throw new Error(`${label}: footer state mismatch`);
    if (view === "product" && (label === "phone-390" || label === "desktop")) {
      await page.screenshot({ path: `${RESULTS}/${label}-product.png`, timeout: NAVIGATION_TIMEOUT });
    }
    if (view === "runtime") {
      if ((await page.locator("#execution-field").getAttribute("data-scene-state")) !== "suppressed") {
        throw new Error(`${label}: WebGL sculpture still competes with the Runtime stage`);
      }
      const runtimeGeometry = await page.evaluate(() => {
        const serialize = (element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        };
        const stage = document.querySelector("[data-runtime-path]");
        const hub = document.querySelector("[data-runtime-hub]");
        const secondary = [...document.querySelectorAll("[data-runtime-phase]:not([data-runtime-hub])")];
        return {
          viewport: { width: innerWidth, height: innerHeight },
          stage: stage ? serialize(stage) : null,
          hub: hub ? serialize(hub) : null,
          secondary: secondary.map(serialize),
          hubFontSize: hub ? Number.parseFloat(getComputedStyle(hub.querySelector("strong")).fontSize) : 0,
          secondaryFontSizes: secondary.map((element) => Number.parseFloat(getComputedStyle(element.querySelector("b")).fontSize)),
        };
      });
      const boxes = [runtimeGeometry.stage, runtimeGeometry.hub, ...runtimeGeometry.secondary].filter(Boolean);
      if (!runtimeGeometry.stage || !runtimeGeometry.hub || boxes.some((box) => box.left < -1 || box.right > runtimeGeometry.viewport.width + 1 || box.top < -1 || box.bottom > runtimeGeometry.viewport.height + 1)) {
        throw new Error(`${label}: Runtime path escapes the viewport ${JSON.stringify(runtimeGeometry)}`);
      }
      if (runtimeGeometry.hubFontSize < Math.max(...runtimeGeometry.secondaryFontSizes) * 3) {
        throw new Error(`${label}: Event Log no longer owns the Runtime hierarchy ${JSON.stringify(runtimeGeometry)}`);
      }
      if (label === "phone-390" || label === "desktop") await page.screenshot({ path: `${RESULTS}/${label}-runtime.png`, timeout: NAVIGATION_TIMEOUT });
    }
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

  await page.waitForFunction(() => !document.querySelector(".stage")?.hasAttribute("data-transitioning"));

  if (label === "phone-320" || label === "desktop") {
    await page.waitForTimeout(1000);
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
  await page.screenshot({ path: `${RESULTS}/${label}.png`, timeout: NAVIGATION_TIMEOUT });
  await context.close();
}

const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
const reducedPage = await reduced.newPage();
await reducedPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
await reducedPage.waitForFunction(() => document.documentElement.dataset.field === "ready");
await reducedPage.waitForFunction(() => document.documentElement.dataset.boot === "complete");
if (!(await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))) {
  throw new Error("Reduced-motion media query did not apply");
}
await reducedPage.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-renderer") === "webgl2");
await reducedPage.locator('[data-view-target="product"]').first().click();
await reducedPage.locator("[data-product-inspector]").focus();
await reducedPage.waitForFunction(() => document.querySelector("#product-hover-field")?.getAttribute("data-progress") === "1.000");
await reducedPage.locator('[data-view-target="runtime"]').first().click();
await reducedPage.screenshot({ path: `${RESULTS}/reduced-motion.png`, timeout: NAVIGATION_TIMEOUT });
await reduced.close();

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
await fallbackPage.waitForFunction(() => document.documentElement.dataset.boot === "complete");
if (!(await fallbackPage.locator(".execution-field__fallback").isVisible())) throw new Error("Static fallback is not visible");
if ((await fallbackPage.locator(".fallback-wordmark").textContent())?.trim() !== "Maka") throw new Error("Static Maka wordmark is incomplete");
if ((await fallbackPage.locator(".execution-field__fallback").getAttribute("preserveAspectRatio")) !== "xMidYMid meet") throw new Error("Static Maka wordmark can be cropped by the viewport");
if ((await fallbackPage.locator("#product-hover-field").getAttribute("data-hover-state")) !== "unavailable") throw new Error("Product proof does not preserve its DOM fallback without WebGL");
await fallbackPage.screenshot({ path: `${RESULTS}/webgl-fallback.png`, timeout: NAVIGATION_TIMEOUT });
await fallback.close();

const noRenderer = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await noRenderer.route(/\/src\/components\/ExecutionField\.astro(?:\?|$)|\/_astro\/ExecutionField\./, (route) => route.abort());
const noRendererPage = await noRenderer.newPage();
await noRendererPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
await noRendererPage.waitForFunction(() => document.documentElement.dataset.boot === "complete");
if (!(await noRendererPage.locator("#overview-title").isVisible())) throw new Error("Core hero is hidden while renderer code is unavailable");
if (!(await noRendererPage.locator(".execution-field__fallback").isVisible())) throw new Error("Static field is hidden while renderer code is unavailable");
await noRendererPage.screenshot({ path: `${RESULTS}/renderer-blocked.png`, timeout: NAVIGATION_TIMEOUT });
await noRenderer.close();

await browser.close();

if (report.consoleErrors.length || report.pageErrors.length || report.requestFailures.length) {
  throw new Error(`Browser errors: ${JSON.stringify(report, null, 2)}`);
}

await writeFile(`${RESULTS}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
