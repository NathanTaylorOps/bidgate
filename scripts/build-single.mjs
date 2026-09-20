/**
 * Build a single self-contained HTML file (dist/bidgate.html) with no build tooling.
 * Strategy: inline every ES module as a data: URL via an import map, rewriting relative specifiers to bare keys.
 * Module semantics are preserved exactly; nothing is transpiled. Works in every evergreen browser (import maps: 2023+).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const entry = 'src/ui/app.js';
const modules = new Map(); // key → source

function keyFor(abs) { return 'bidgate/' + path.relative(root, abs).replace(/\\/g, '/'); }

function collect(abs) {
  const key = keyFor(abs);
  if (modules.has(key)) return;
  modules.set(key, ''); // reserve first — breaks import cycles
  let src = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);
  const rewrite = (spec) => {
    if (!spec.startsWith('.')) return spec;
    const target = path.resolve(dir, spec);
    collect(target);
    return keyFor(target);
  };
  src = src.replace(/(from\s+['"])([^'"]+)(['"])/g, (_, a, s, c) => a + rewrite(s) + c);
  src = src.replace(/(import\(\s*['"])([^'"]+)(['"]\s*\))/g, (_, a, s, c) => a + rewrite(s) + c);
  src = src.replace(/(^|\n)import\s+['"]([^'"]+)['"]/g, (_, a, s) => `${a}import '${rewrite(s)}'`);
  modules.set(key, src);
}
collect(path.join(root, entry));

const imports = {};
for (const [k, src] of modules) imports[k] = 'data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const importMap = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
html = html.replace(/<script type="module" src="\.\/src\/ui\/app\.js"><\/script>/, `${importMap}\n<script type="module">import 'bidgate/${entry}';</script>`);
html = html.replace('<title>BidGate</title>', '<title>BidGate</title>\n<!-- Single-file build. Source: https://github.com/nathan-taylor-ops/bidgate -->');
// index.html already links METHODOLOGY.md by absolute GitHub URL (the single file may be opened from a USB stick,
// where a relative docs/ link would dangle). This rewrite is kept as a no-op-safe guard should it ever go relative again.
html = html.replace('href="docs/METHODOLOGY.md"', 'href="https://github.com/nathan-taylor-ops/bidgate/blob/main/docs/METHODOLOGY.md"');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'bidgate.html'), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`dist/bidgate.html — ${modules.size} modules inlined, ${kb} KB`);
