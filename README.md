<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="Traceway%20Logo%20White.png" />
    <source media="(prefers-color-scheme: light)" srcset="Traceway%20Logo.png" />
    <img src="Traceway Logo.png" alt="Traceway Logo" width="200" />
  </picture>
</p>

<h3 align="center">How source maps fall short where it matters most</h3>

<p align="center">
  <sub>Demo project for the Traceway deep dive into the JS/TS toolchain</sub>
</p>

<p align="center">
  <a href="https://tracewayapp.com/blog/deep-dive-into-the-sourcemaps">Read the blog post</a> · <a href="https://tracewayapp.com">Website</a> · <a href="https://github.com/tracewayapp/traceway">Traceway</a>
</p>

---

This is a **demo project**. It shows, fully reproducibly, that a source map alone can recover the original **file, line, and column** of every frame in a minified stack trace, but **not the function names**. For the names you also need the minified bundle itself, parsed.

The whole story (the VLQ decoding by hand, the failure modes, the fix, and how Node gets away with it) is in the blog post: **[Deep dive into the JS/TS toolchain: How source maps fall short where it matters most](https://tracewayapp.com/blog/deep-dive-into-the-sourcemaps)**.

## Run it

```bash
npm install
npm run build        # bundle + minify the demo program into dist/
npm run crash        # run the minified bundle, see the raw production stack trace
npm run decode       # dump the source map's decoded mapping table
npm run demo         # resolve the trace using ONLY the map: locations work, names don't
npm run symbolicate  # the fix: the full 3-step algorithm (map + bundle parsed with acorn)
npm run heuristic    # catch the caller-site heuristic lying (indirect call + async)
npm run compare      # minified vs non-minified vs node --enable-source-maps vs the target
npm run quirk        # raw `node --enable-source-maps` trace: a name leaks onto a global frame
npm run no-quirk     # same, but the call sits in a named test(): the leak renames from handleSignup to test
```

## What's in here

```
src/                          the tiny TypeScript program that crashes
src-heuristic/                variant program with an indirect call and an async caller
dist/                         bundles and source maps (npm run build regenerates them)
scripts/vlq.mjs               minimal VLQ mappings decoder, no dependencies
scripts/decode-map.mjs        prints the decoded mapping table
scripts/map-only-resolve.mjs  resolves the stack trace with the map only
scripts/symbolicate.mjs       the correct algorithm: location -> enclosure -> name
scripts/caller-heuristic.mjs  shows when "steal the name from the frame below" lies
scripts/compare-traces.mjs    four traces side by side
scripts/quirk.mjs             runs `node --enable-source-maps` on the demo, raw leaked trace
scripts/node-no-quirk.mjs     same, on src/no-quirk.ts (call wrapped in a named test())
```

## The leak: `quirk` vs `no-quirk`

Both commands run a real `node --enable-source-maps`, and **both still leak**, because the bug lives in Node's source-map decoder, not in the program. Node stamps a phantom function name onto the map's last (nameless) segment, and the bottom global frame of the trace floor-looks-up into it. **The leaked name is always whatever function esbuild named last before the bundle's tail**, which is exactly why the two runs below leak different names.

`npm run quirk` runs the original program (`src/index.ts`, a bare top-level call):

```
Error: user has no name
    at validateUser (src/user.ts:8:11)
    at handleSignup (src/index.ts:4:10)   real
    at handleSignup (src/index.ts:7:1)    leak: line 7 is top-level code, not handleSignup
    at <anonymous>  (src/index.ts:7:29)
```

`handleSignup` prints **twice**: once where it really runs, once leaked onto the global frame right below it. `<anonymous>` prints once.

`npm run no-quirk` runs the same crash, but the top-level call now sits inside a named `test()` function (`src/no-quirk.ts`):

```
Error: user has no name
    at validateUser (src/user.ts:8:11)
    at handleSignup (src/no-quirk.ts:4:10)   handleSignup, now correct and printed once
    at test (src/no-quirk.ts:7:3)            real test (its call to handleSignup)
    at test (src/no-quirk.ts:10:1)           leak: line 10 is `test();`, module-level code
    at <anonymous>  (src/no-quirk.ts:10:6)
```

Now `test()` is the last named call before the bundle's tail, so **the leak renames itself.** `handleSignup` drops from twice to **once**, and `test` shows up **twice**: the real one (its body calling `handleSignup`) and the phantom stamped onto the module-level `test()` frame. The name `no-quirk` is ironic: the quirk did not go away, adding a layer just changed which name gets leaked. You can move the leak onto a different function by reshaping the program, but you cannot make it disappear, because the phantom name lives on the map's last segment regardless.

The only thing that actually removes it is a one-line fix in Node's decoder (guard the name read with `hasNext()`), which is the wider point of [the blog post](https://tracewayapp.com/blog/deep-dive-into-the-sourcemaps).

---

<p align="center">
  <sub>Built in the open by <a href="https://tracewayapp.com">Traceway</a>, an MIT-licensed, OpenTelemetry-native observability platform with exception tracking · <a href="https://github.com/tracewayapp/traceway">github.com/tracewayapp/traceway</a></sub>
</p>
