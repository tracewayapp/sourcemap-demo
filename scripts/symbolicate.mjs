// The full, correct symbolicator: map + parsed bundle.
//
// Three steps per frame:
//   STEP 1  LOCATION   (map only)     floor-lookup the frame position        -> original file:line:col
//   STEP 2  ENCLOSURE  (bundle only)  walk the bundle AST; find the function
//                                     enclosing the frame column, and the
//                                     column of that function's NAME TOKEN
//   STEP 3  NAME       (map again)    floor-lookup the name-token column     -> original name
//
// Step 2 is the only step that touches the bundle, and it is the step the
// source map cannot perform: the map is a list of points, the enclosure
// answer lives in the bundle's brace structure.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as acorn from "acorn";
import { decodeMappings, floorLookup } from "./vlq.mjs";

const map = JSON.parse(readFileSync("dist/app.min.js.map", "utf8"));
const rows = decodeMappings(map);
const bundleLine = readFileSync("dist/app.min.js", "utf8").split("\n")[0];

// --- STEP 2 prep: parse the bundle once into a compact scope index ---
const ast = acorn.parse(bundleLine, { ecmaVersion: "latest" });
const scopes = [];
(function walk(node) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
    scopes.push({
      start: node.start,
      end: node.end,                            // acorn ends are exclusive: [start, end)
      nameCol: node.id ? node.id.start : null,  // column of the function's NAME token
    });
  }
  // (a production symbolicator also indexes ArrowFunctionExpression, methods,
  //  and class members; this bundle only needs the two declarations)
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v.type === "string") walk(v);
  }
})(ast);
scopes.sort((a, b) => (b.start - a.start) || (a.end - b.end)); // innermost first

function enclosingScope(col) {
  for (const s of scopes) if (col >= s.start && col < s.end) return s;
  return null; // inside no function => global scope
}

// --- resolve one frame (1-based line/col, straight from the trace) ---
function symbolicate(line1, col1) {
  const col0 = col1 - 1;
  const locHit = floorLookup(rows, line1 - 1, col0);            // STEP 1
  const scope = enclosingScope(col0);                           // STEP 2
  let name;
  if (scope === null || scope.nameCol === null) {
    name = "<global>";
  } else {
    const nameHit = floorLookup(rows, line1 - 1, scope.nameCol); // STEP 3
    name = nameHit && nameHit.name ? nameHit.name : "(unknown)";
  }
  const loc = locHit ? `${locHit.source}:${locHit.line + 1}:${locHit.col + 1}` : "(no mapping)";
  return { name, loc, locHit, scope, col0 };
}

// --- get the real trace by running the minified bundle ---
const run = spawnSync("node", ["dist/app.min.js"], { encoding: "utf8" });
const frameRe = /^\s+at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
const frames = [];
for (const lineText of run.stderr.split("\n")) {
  const m = lineText.match(frameRe);
  if (m && m[2].includes("app.min.js")) {
    frames.push({ fn: m[1] ?? "(anon)", line: Number(m[3]), col: Number(m[4]) });
  }
}

console.log("SYMBOLICATING WITH MAP + PARSED BUNDLE (the three-step algorithm):\n");
const resolved = [];
for (const f of frames) {
  const r = symbolicate(f.line, f.col);
  console.log(`  raw frame:  at ${f.fn} (${f.line}:${f.col})`);
  console.log(`   step1 location  map.lookup(${f.line}:${r.col0})${" ".repeat(Math.max(1, 5 - String(r.col0).length))}-> ${r.loc}`);
  if (r.scope === null) {
    console.log(`   step2 enclosure col ${r.col0} is inside NO function => <global>`);
    console.log(`   step3 name      (global, no lookup)`);
  } else {
    console.log(`   step2 enclosure col ${r.col0} is inside function whose name token is at col ${r.scope.nameCol}`);
    console.log(`   step3 name      map.lookup(${f.line}:${r.scope.nameCol})${" ".repeat(Math.max(1, 5 - String(r.scope.nameCol).length))}-> ${JSON.stringify(r.name)}`);
  }
  console.log(`   RESULT:  at ${r.name} (${r.loc})\n`);
  resolved.push(r);
}

console.log("SYMBOLICATED TRACE:\n");
console.log("Error: user has no name");
for (const r of resolved) {
  console.log(`    at ${r.name} (${r.loc.replace(/^(\.\.\/)+/, "")})`);
}
