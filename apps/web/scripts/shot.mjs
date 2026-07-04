// Screenshot harness for visual QA: node scripts/shot.mjs <url> <outfile> [--click "css-selector"]...
// Renders at 1440x900, waits for network idle + animations, optional clicks between waits.
import { chromium } from "playwright";

const [url, outfile, ...rest] = process.argv.slice(2);
if (!url || !outfile) {
  console.error('usage: node scripts/shot.mjs <url> <outfile> [--click "selector"]...');
  process.exit(1);
}
const clicks = [];
for (let i = 0; i < rest.length; i += 2) {
  if (rest[i] === "--click" && rest[i + 1]) clicks.push(rest[i + 1]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
for (const sel of clicks) {
  await page.click(sel);
  await page.waitForTimeout(900);
}
await page.screenshot({ path: outfile });
await browser.close();
console.log("saved", outfile);
