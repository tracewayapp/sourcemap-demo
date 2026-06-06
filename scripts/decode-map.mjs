import { readFileSync } from "node:fs";
import { decodeMappings } from "./vlq.mjs";

const map = JSON.parse(readFileSync("dist/app.min.js.map", "utf8"));
const bundle = readFileSync("dist/app.min.js", "utf8").split("\n")[0];
const rows = decodeMappings(map);

console.log("bundle col -> original file:line:col      name          | bundle text at that col");
for (const r of rows) {
  const loc = `${r.source}:${r.line}:${r.col}`;
  const snippet = JSON.stringify(bundle.slice(r.genCol, r.genCol + 16));
  console.log(`${String(r.genCol).padStart(10)} -> ${loc.padEnd(24)} ${r.name.padEnd(13)} | ${snippet}`);
}
