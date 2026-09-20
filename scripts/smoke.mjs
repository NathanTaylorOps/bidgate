/* Smoke test: serve the repo, load index.html in headless Chromium, click every view, capture console errors + screenshots. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('playwright not found — npm i -D playwright'); process.exit(2); }

const root = path.resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(4173, r));

const entry = process.argv[2] || '/index.html';
const outDir = path.join(root, 'scripts', 'shots'); fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url()));

// Sandbox has no CDN access: route Chart.js to a recording stub and swallow fonts.
await page.route(/cdnjs\.cloudflare\.com.*chart/, r => r.fulfill({ path: path.join(root, 'scripts', 'chart-stub.js'), contentType: 'text/javascript' }));
await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto('http://localhost:4173' + entry, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const views = ['score', 'gates', 'economics', 'capacity', 'decision', 'pipeline', 'calibration', 'settings'];
for (const v of views) {
  await page.click(`#nav button[data-view="${v}"]`);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, `${v}.png`), fullPage: v === 'score' ? false : true });
}
// interactions
await page.click('#nav button[data-view="score"]');
await page.waitForTimeout(200);
const firstCrit = page.locator('.crit').first();
await firstCrit.focus();
await page.keyboard.press('2');
await page.waitForTimeout(150);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('5');
await page.waitForTimeout(150);
const side = await page.locator('#side .verdict .title').innerText();
// expert mode
await page.click('#modeExpert'); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, 'score-expert.png') });
await page.click('#nav button[data-view="settings"]'); await page.waitForTimeout(200);
await page.click('#wAhp'); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, 'ahp.png'), fullPage: true });
await page.click('#wSwing'); await page.waitForTimeout(300);
// theme toggle
await page.click('#themeBtn'); await page.waitForTimeout(300);
await page.click('#nav button[data-view="decision"]'); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, 'decision-dark.png'), fullPage: true });
// print memo
await page.emulateMedia({ media: 'print' });
await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, 'memo-print.png'), fullPage: true });
await page.emulateMedia({ media: 'screen' });
// mobile
await page.setViewportSize({ width: 400, height: 800 });
await page.click('#nav button[data-view="score"]'); await page.waitForTimeout(300);
const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
await page.screenshot({ path: path.join(outDir, 'mobile.png') });

const chartCount = await page.evaluate(() => window.Chart?.__instances?.length ?? -1);
console.log('live chart instances on last view:', chartCount);
console.log('verdict after keys:', side);
console.log('mobile horizontal scroll:', hscroll);
console.log('errors:', errors.length);
for (const e of errors) console.log('  ', e);
await browser.close();
server.close();
process.exit(errors.filter(e => !e.includes('[warning]')).length ? 1 : 0);
