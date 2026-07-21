import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
await mkdir("test-results/round3", { recursive: true });
const b = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
const shot = (path) => p.screenshot({ path, animations: "disabled", caret: "hide", timeout: 45000 });
await p.goto("http://localhost:4500", { waitUntil: "load" });
await p.waitForFunction(() => document.documentElement.classList.contains("is-loaded"));
await p.waitForTimeout(600);
for (let i = 0; i < 40; i++) {
  await p.mouse.move(760 + Math.cos(i/4)*300, 420 + Math.sin(i/4)*200, { steps: 3 });
  await p.waitForTimeout(24);
}
await shot("test-results/round3/01-hero-fluid.png");
await p.waitForTimeout(2500);
await shot("test-results/round3/02-hero-settled.png");
await p.keyboard.press("a");
await p.waitForTimeout(1600);
await shot("test-results/round3/03-hero-dark.png");
await p.evaluate(() => document.querySelector("#work").scrollIntoView({ behavior: "instant" }));
await p.waitForTimeout(1500);
await shot("test-results/round3/04-work-dark.png");
await p.evaluate(() => document.querySelector("#runtime").scrollIntoView({ behavior: "instant" }));
await p.waitForTimeout(1500);
await shot("test-results/round3/05-runtime-dark.png");
const state = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("maka-theme") }));
console.log(JSON.stringify(state));
await b.close();
