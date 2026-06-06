import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { decodeMappings, floorLookup } from "./vlq.mjs";

const map = JSON.parse(readFileSync("dist/app.min.js.map", "utf8"));
const rows = decodeMappings(map);

const run = spawnSync("node", ["dist/app.min.js"], { encoding: "utf8" });
const stack = run.stderr;

const frameRe = /^\s+at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
const frames = [];
for (const lineText of stack.split("\n")) {
  const m = lineText.match(frameRe);
  if (m && m[2].includes("app.min.js")) {
    frames.push({ fn: m[1] ?? "(no name)", line: Number(m[3]), col: Number(m[4]) });
  }
}

console.log("THE STACK TRACE (from running the minified bundle):\n");
for (const l of stack.split("\n")) {
  if (l.includes("    at") || l.startsWith("Error")) console.log(l.replace(/\/.*\//, ""));
}

console.log("\nMAP-ONLY RESOLUTION (no bundle parsing):\n");
console.log("frame                     | resolved location (works!) | map name at frame position");
console.log("--------------------------+----------------------------+---------------------------");
for (const f of frames) {
  const hit = floorLookup(rows, f.line - 1, f.col - 1);
  const frameDesc = `at ${f.fn} (1:${f.col})`;
  if (!hit) {
    console.log(`${frameDesc.padEnd(25)} | (no mapping)               |`);
    continue;
  }
  const loc = `${hit.source}:${hit.line + 1}:${hit.col + 1}`;
  console.log(`${frameDesc.padEnd(25)} | ${loc.padEnd(26)} | ${JSON.stringify(hit.name)}`);
}

console.log("\nWhat the names SHOULD be: validateUser, handleSignup, <global>.");
console.log("See README.md for why the map alone cannot produce them.");
