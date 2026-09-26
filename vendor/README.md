# vendor/

Third-party runtime code checked into the repo so `dist/bidgate.html` needs
zero network access. This project has no build step of its own
([ADR-0001](../docs/adr/0001-single-file-no-build.md)) — vendoring means
"the file lives in the repo," not "there's a bundler now."

## chart.umd.min.js

Chart.js 4.4.1, the UMD/auto-registering build (same as
`Chart.js/4.4.1/chart.umd.min.js` on cdnjs), with `@kurkle/color` 0.3.0
inlined — that's Chart.js's one runtime dependency and cdnjs's build
inlines it too.

Built locally with esbuild from the two upstream MIT-licensed source repos
(no npm registry involved):

- `github.com/chartjs/Chart.js` @ `ac53fd282ee1a35512b532bb10bca9d74e2f8e41` (tag `v4.4.1`)
- `github.com/kurkle/color` @ `5e025324bae1213c84a46e92b02a48d7bb8212b0` (tag `v0.3.0`)
- esbuild 0.27.7

Build command (entry point is Chart.js's own `src/index.umd.ts`, the same
one its own rollup config uses for `dist/chart.umd.js` — same registrations,
same public API):

```js
esbuild.build({
  entryPoints: ['<Chart.js checkout>/src/index.umd.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2018',
  outfile: 'vendor/chart.umd.min.js',
  alias: { '@kurkle/color': '<color checkout>/src/index.esm.js' },
  loader: { '.ts': 'ts' },
});
```

Verified against the real cdnjs build by rendering a bar chart with it in a
real browser (Playwright) and checking `Chart.version === '4.4.1'` and that
a `new Chart(ctx, {...})` call actually draws.

`chart.js.LICENSE.md` is Chart.js's own MIT licence text, copied verbatim;
`@kurkle/color`'s MIT licence is the same terms, credited in the banner
comment at the top of `chart.umd.min.js`.

To pick up a newer Chart.js version: re-run the same build against a newer
tag of both repos and replace this file — there's no `npm install` step to
run.
