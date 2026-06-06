// Catches the caller-site heuristic lying.
//
// The heuristic: steal frame N's name from the map entry at frame N+1's
// position (a caller's saved position is a call site, and a direct call
// token carries the callee's original name). It answers the question
// "what name was spelled at the call site one frame down". The question a
// frame actually poses is "which function's body is executing here". This
// script runs a program whose calls are not boring (an indirect call
// through a parameter, and an async resumption) and prints the heuristic's
// answer next to the truth, computed via the enclosure algorithm.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cwd } from "node:process";
import * as acorn from "acorn";
import { decodeMappings, floorLookup } from "./vlq.mjs";

// build the variant program
const build = spawnSync(
  "node_modules/.bin/esbuild",
  [
    "src-heuristic/index.ts",
    "--bundle",
    "--format=iife",
    "--minify",
    "--sourcemap",
    "--outfile=dist/heuristic.min.js",
  ],
  { encoding: "utf8" },
);
if (build.status !== 0) {
  console.error(build.stderr);
  process.exit(1);
}

const map = JSON.parse(readFileSync("dist/heuristic.min.js.map", "utf8"));
const rows = decodeMappings(map);
const bundleLine = readFileSync("dist/heuristic.min.js", "utf8").split("\n")[0];

// enclosure index (truth), same walk as scripts/symbolicate.mjs
const ast = acorn.parse(bundleLine, { ecmaVersion: "latest" });
const scopes = [];
(function walk(node) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
    scopes.push({
      start: node.start,
      end: node.end,
      nameCol: node.id ? node.id.start : null,
    });
  }
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v.type === "string") walk(v);
  }
})(ast);
scopes.sort((a, b) => (b.start - a.start) || (a.end - b.end));

function enclosureName(col0) {
  for (const s of scopes) {
    if (col0 >= s.start && col0 < s.end) {
      if (s.nameCol === null) return "<global>";
      const hit = floorLookup(rows, 0, s.nameCol);
      return hit && hit.name ? hit.name : "(unknown)";
    }
  }
  return "<global>";
}

// crash it
const run = spawnSync("node", ["dist/heuristic.min.js"], { encoding: "utf8" });
const frameRe = /^\s+at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
const frames = [];
for (const lineText of run.stderr.split("\n")) {
  const m = lineText.match(frameRe);
  if (m && m[2].includes("heuristic.min.js")) {
    frames.push({ fn: m[1] ?? "(no name)", line: Number(m[3]), col: Number(m[4]) });
  }
}

console.log("THE CRASH (indirect call + async this time):\n");
for (const l of run.stderr.split("\n")) {
  if (l.includes("    at") || l.startsWith("Error")) {
    console.log(l.replaceAll(`file://${cwd()}/dist/`, "").replaceAll(`${cwd()}/dist/`, ""));
  }
}

console.log("\nCALLER-SITE HEURISTIC vs THE TRUTH:\n");
console.log("frame            | stolen from the frame below        | truth (enclosure)");
console.log("-----------------+------------------------------------+------------------");
for (let i = 0; i < frames.length; i++) {
  const f = frames[i];
  const below = frames[i + 1];
  let stolen;
  if (!below) stolen = "(no frame below, nothing to steal)";
  else {
    const hit = floorLookup(rows, below.line - 1, below.col - 1);
    stolen = JSON.stringify(hit?.name ?? "");
  }
  const truth = enclosureName(f.col - 1);
  const frameDesc = `at ${f.fn} (${f.line}:${f.col})`;
  if (stolen === JSON.stringify(truth)) {
    console.log(`${frameDesc.padEnd(16)} | ${stolen.padEnd(34)} | ${truth} (match)`);
  } else {
    console.log(`${frameDesc.padEnd(16)} | ${stolen.padEnd(34)} | WRONG: ${truth}`);
  }
}

console.log("\nThe heuristic answers \"what was typed at the call site one frame down\",");
console.log("not \"whose body is executing in this frame\". See README.md.");
