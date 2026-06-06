import { spawnSync } from "node:child_process";
import { cwd } from "node:process";

function trace(args) {
  const run = spawnSync("node", args, { encoding: "utf8" });
  return run.stderr
    .split("\n")
    .filter((l) => l.startsWith("Error") || l.includes("    at"))
    .filter((l) => !l.includes("node:"))
    .map((l) => l.replaceAll(`file://${cwd()}/`, "").replaceAll(`${cwd()}/`, ""))
    .join("\n");
}

console.log("=== 1. STARTING POINT: minified bundle (what production sends) ===\n");
console.log(trace(["dist/app.min.js"]));

console.log("\n=== 2. NON-MINIFIED bundle (what minification destroyed) ===\n");
console.log(trace(["dist/app.js"]));

console.log("\n=== 3. minified + node --enable-source-maps ===\n");
console.log(trace(["--enable-source-maps", "dist/app.min.js"]));

console.log("\n=== 4. THE TARGET ===\n");
console.log("Error: user has no name");
console.log("    at validateUser (src/user.ts:8:11)");
console.log("    at handleSignup (src/index.ts:4:10)");
console.log("    at <global> (src/index.ts:7:1)");
