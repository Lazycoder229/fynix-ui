// build/build.js
import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const entryPoints = [
  "runtime.ts",
  "context/context.ts",
  "custom/index.ts",
  "custom/button.ts",
  "custom/path.ts",
  "error/errorOverlay.ts",
  "fynix/index.ts",

  // Hooks
  "hooks/nixAsync.ts",
  "hooks/nixAsyncCache.ts",
  "hooks/nixAsyncDebounce.ts",
  "hooks/nixAsyncQuery.ts",
  "hooks/nixCallback.ts",
  "hooks/nixComputed.ts",
  "hooks/nixDebounce.ts",
  "hooks/nixEffect.ts",
  "hooks/nixForm.ts",
  "hooks/nixFormAsync.ts",
  "hooks/nixInterval.ts",
  "hooks/nixLazy.ts",
  "hooks/nixLazyAsync.ts",
  "hooks/nixLazyFormAsync.ts",
  "hooks/nixLocalStorage.ts",
  "hooks/nixMemo.ts",
  "hooks/nixPrevious.ts",
  "hooks/nixRef.ts",
  "hooks/nixState.ts",
  "hooks/nixStore.ts",

  // Plugins & Router
  "plugins/vite-plugin-res.ts",
  "router/router.ts",
];

async function clean() {
  console.log("Cleaning dist/");
  await execAsync("rm -rf dist");
}

async function buildJS() {
  console.log("Building JavaScript (esbuild)");

  await esbuild.build({
    entryPoints: entryPoints.map(f => path.join(root, f)),
    outdir: path.join(root, "dist"),
    outbase: root,           //  ROOT is the base now
    bundle: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    sourcemap: true,
    minify: false,
    keepNames: true,
  });

  console.log("JS build complete\n");
}

async function buildTypes() {
  console.log("Generating TypeScript declarations");

  await execAsync("tsc --emitDeclarationOnly");

  console.log("Type declarations generated\n");
}

async function build() {
  try {
    await clean();
    await buildJS();
    await buildTypes();
    console.log("🎉 Build finished successfully");
  } catch (err) {
    console.error("❌ Build failed", err);
    process.exit(1);
  }
}

build();
