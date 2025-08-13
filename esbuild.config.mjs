import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "browser",
  target: ["es2020"],
  format: "cjs",
  sourcemap: true,
  external: ["obsidian"]
});

// ensure manifest is in dist
mkdirSync("dist", { recursive: true });
copyFileSync("manifest.json", "dist/manifest.json");
console.log("Build complete");
