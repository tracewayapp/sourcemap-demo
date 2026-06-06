<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="Traceway%20Logo%20White.png" />
    <source media="(prefers-color-scheme: light)" srcset="Traceway%20Logo.png" />
    <img src="Traceway Logo.png" alt="Traceway Logo" width="200" />
  </picture>
</p>

<h3 align="center">Source maps can't do the one thing you think they do</h3>

<p align="center">
  <sub>Demo project for the Traceway deep dive into the JS/TS toolchain</sub>
</p>

<p align="center">
  <a href="https://tracewayapp.com/blog/deep-dive-into-the-sourcemaps">Read the blog post</a> · <a href="https://tracewayapp.com">Website</a> · <a href="https://github.com/tracewayapp/traceway">Traceway</a>
</p>

---

This is a **demo project**. It shows, fully reproducibly, that a source map alone can recover the original **file, line, and column** of every frame in a minified stack trace, but **not the function names**. For the names you also need the minified bundle itself, parsed.

The whole story (the VLQ decoding by hand, the failure modes, the fix, and how Node gets away with it) is in the blog post: **[Deep dive into the JS/TS toolchain: Source maps can't do the one thing you think they do](https://tracewayapp.com/blog/deep-dive-into-the-sourcemaps)**.

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
```

---

<p align="center">
  <sub>Built in the open by <a href="https://tracewayapp.com">Traceway</a>, an MIT-licensed, OpenTelemetry-native observability platform with exception tracking · <a href="https://github.com/tracewayapp/traceway">github.com/tracewayapp/traceway</a></sub>
</p>
