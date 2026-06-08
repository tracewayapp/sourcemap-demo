import { spawnSync } from "node:child_process";

spawnSync("node", ["--enable-source-maps", "dist/app.min.js"], { stdio: "inherit" });
