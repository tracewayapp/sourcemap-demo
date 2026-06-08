import { spawnSync } from "node:child_process";

const build = spawnSync(
  "node_modules/.bin/esbuild",
  [
    "src/no-quirk.ts",
    "--bundle",
    "--format=iife",
    "--minify",
    "--sourcemap",
    "--outfile=dist/no-quirk.min.js",
  ],
  { encoding: "utf8" },
);
if (build.status !== 0) {
  process.stderr.write(build.stderr || "esbuild failed\n");
  process.exit(build.status ?? 1);
}

spawnSync("node", ["--enable-source-maps", "dist/no-quirk.min.js"], { stdio: "inherit" });
