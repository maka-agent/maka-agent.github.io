import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const OUT = process.env.OUT ?? "test-results/visual";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto(process.env.MAKA_SITE_URL ?? "http://localhost:4321", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.field === "ready");
await page.mouse.move(900, 420);
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/01-hero.png` });
for (const [name, sel] of [["02-work", "#work"], ["04-runtime", "#runtime"]]) {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "instant" }), sel);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await page.evaluate(() => { const st = document.getElementById("statement"); st.scrollIntoView({behavior:"instant", block:"center"}); });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/03-statement.png` });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/05-cta.png` });
// mid-work entry 2/3
await page.evaluate(() => { document.querySelectorAll('.entry')[1].scrollIntoView({behavior:"instant"}); window.scrollBy(0,-80); });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/02b-entries.png` });
await browser.close();
