/* // build/build.js
import { exec } from "child_process";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const entryPoints = [
  path.resolve(__dirname, "runtime.ts"),
  path.resolve(__dirname, "context/context.ts"),
  path.resolve(__dirname, "custom/index.ts"),
  path.resolve(__dirname, "custom/button.ts"),
  path.resolve(__dirname, "custom/path.ts"),
  path.resolve(__dirname, "error/errorOverlay.ts"),
  path.resolve(__dirname, "fynix/index.ts"),

  // Hooks
  path.resolve(__dirname, "hooks/nixAsync.ts"),
  path.resolve(__dirname, "hooks/nixAsyncCache.ts"),
  path.resolve(__dirname, "hooks/nixAsyncDebounce.ts"),
  path.resolve(__dirname, "hooks/nixAsyncQuery.ts"),
  path.resolve(__dirname, "hooks/nixCallback.ts"),
  path.resolve(__dirname, "hooks/nixComputed.ts"),
  path.resolve(__dirname, "hooks/nixDebounce.ts"),
  path.resolve(__dirname, "hooks/nixEffect.ts"),
  path.resolve(__dirname, "hooks/nixForm.ts"),
  path.resolve(__dirname, "hooks/nixFormAsync.ts"),
  path.resolve(__dirname, "hooks/nixInterval.ts"),
  path.resolve(__dirname, "hooks/nixLazy.ts"),
  path.resolve(__dirname, "hooks/nixLazyAsync.ts"),
  path.resolve(__dirname, "hooks/nixLazyFormAsync.ts"),
  path.resolve(__dirname, "hooks/nixLocalStorage.ts"),
  path.resolve(__dirname, "hooks/nixMemo.ts"),
  path.resolve(__dirname, "hooks/nixPrevious.ts"),
  path.resolve(__dirname, "hooks/nixRef.ts"),
  path.resolve(__dirname, "hooks/nixState.ts"),
  path.resolve(__dirname, "hooks/nixStore.ts"),

  // Plugins & Router
  path.resolve(__dirname, "plugins/vite-plugin-res.ts"),
  path.resolve(__dirname, "router/router.ts"),
];

async function clean() {
  console.log("Cleaning dist/");
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

async function buildJS() {
  console.log("Building JavaScript (esbuild)");

  await esbuild.build({
    entryPoints: entryPoints,
    outdir: path.join(root, "dist"),
    outbase: root,
    bundle: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    sourcemap: true,
    minify: false,
    keepNames: true,
    loader: { ".ts": "ts" },
    // 'external' is not allowed when bundle is false
  });

  console.log("JS build complete\n");
}

async function buildTypes() {
  console.log("Generating TypeScript declarations");

  try {
    // Use tsconfig.build.json for production builds
    await execAsync("tsc --project tsconfig.build.json", {
      cwd: __dirname, // Run in the core directory where tsconfig.build.json exists
    });
    console.log("Type declarations generated\n");
  } catch (error) {
    console.error("TypeScript declaration generation failed:");
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}

async function copyPackageFiles() {
  console.log("Copying package files");

  // Copy package.json
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf-8")
  );

  // Optional: Clean up package.json for distribution
  delete pkg.scripts;
  delete pkg.devDependencies;

  fs.writeFileSync(
    path.join(root, "dist", "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  // Copy README if exists
  if (fs.existsSync(path.join(root, "README.md"))) {
    fs.copyFileSync(
      path.join(root, "README.md"),
      path.join(root, "dist", "README.md")
    );
  }

  console.log("Package files copied\n");
}

async function build() {
  try {
    await clean();
    await buildJS();
    await buildTypes();
    await copyPackageFiles();
    console.log("Build finished successfully!");
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

build();
 */
// build/build.js
import { exec } from "child_process";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const entryPoints = [
  path.resolve(__dirname, "runtime.ts"),
  path.resolve(__dirname, "context/context.ts"),
  path.resolve(__dirname, "custom/index.ts"),
  path.resolve(__dirname, "custom/button.ts"),
  path.resolve(__dirname, "custom/path.ts"),
  path.resolve(__dirname, "error/errorOverlay.ts"),
  path.resolve(__dirname, "fynix/index.ts"),

  // Hooks
  path.resolve(__dirname, "hooks/nixAsync.ts"),
  path.resolve(__dirname, "hooks/nixAsyncCache.ts"),
  path.resolve(__dirname, "hooks/nixAsyncDebounce.ts"),
  path.resolve(__dirname, "hooks/nixAsyncQuery.ts"),
  path.resolve(__dirname, "hooks/nixCallback.ts"),
  path.resolve(__dirname, "hooks/nixComputed.ts"),
  path.resolve(__dirname, "hooks/nixDebounce.ts"),
  path.resolve(__dirname, "hooks/nixEffect.ts"),
  path.resolve(__dirname, "hooks/nixForm.ts"),
  path.resolve(__dirname, "hooks/nixFormAsync.ts"),
  path.resolve(__dirname, "hooks/nixInterval.ts"),
  path.resolve(__dirname, "hooks/nixLazy.ts"),
  path.resolve(__dirname, "hooks/nixLazyAsync.ts"),
  path.resolve(__dirname, "hooks/nixLazyFormAsync.ts"),
  path.resolve(__dirname, "hooks/nixLocalStorage.ts"),
  path.resolve(__dirname, "hooks/nixMemo.ts"),
  path.resolve(__dirname, "hooks/nixPrevious.ts"),
  path.resolve(__dirname, "hooks/nixRef.ts"),
  path.resolve(__dirname, "hooks/nixState.ts"),
  path.resolve(__dirname, "hooks/nixStore.ts"),

  // Router
  path.resolve(__dirname, "router/router.ts"),
];

// Separate entry points for plugins (Node environment)
const pluginEntryPoints = [
  path.resolve(__dirname, "plugins/vite-plugin-res.ts"),
];

async function clean() {
  console.log("Cleaning dist/");
  const distPath = path.join(root, "dist");
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

async function buildJS() {
  console.log("Building JavaScript (esbuild) - Browser bundles");

  await esbuild.build({
    entryPoints: entryPoints,
    outdir: path.join(__dirname, "dist"),
    outbase: __dirname,
    bundle: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    sourcemap: true,
    minify: false,
    keepNames: true,
    loader: { ".ts": "ts" },
  });

  console.log("Browser JS build complete\n");
}

async function buildPlugins() {
  console.log("Building Vite Plugins (esbuild) - Node bundles");

  await esbuild.build({
    entryPoints: pluginEntryPoints,
    outdir: path.join(__dirname, "dist"),
    outbase: __dirname,
    bundle: false,
    format: "esm",
    platform: "node",
    target: ["node16"],
    sourcemap: true,
    minify: false,
    keepNames: true,
    loader: { ".ts": "ts" },
  });

  console.log("Plugin JS build complete\n");
}

async function buildTypes() {
  console.log("Generating TypeScript declarations");

  try {
    // Use tsconfig.build.json for production builds
    await execAsync("tsc --project tsconfig.build.json", {
      cwd: __dirname,
    });
    console.log("Type declarations generated\n");
  } catch (error) {
    console.error("TypeScript declaration generation failed:");
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}

async function copyPackageFiles() {
  console.log("Copying package files");

  // Only use core/package.json
  const pkgPath = path.join(__dirname, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn(
      "Warning: No package.json found in core directory. Skipping package.json copy."
    );
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // Optional: Clean up package.json for distribution
  delete pkg.scripts;
  delete pkg.devDependencies;

  fs.writeFileSync(
    path.join(__dirname, "dist", "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  // Copy README if exists (prefer core/README.md)
  const readmePath = path.join(__dirname, "README.md");
  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, path.join(__dirname, "dist", "README.md"));
  }

  console.log("Package files copied\n");
}

async function build() {
  try {
    await clean();
    await buildJS();
    await buildPlugins();
    await buildTypes();
    await copyPackageFiles();
    console.log("Build finished successfully!");
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
}

build();
