// build.js

import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// List all entry points you want to build (main and submodules)
const entryPoints = [
  'runtime.js',
  // Context
  'context/context.js',
  // Custom components
  'custom/index.js',
  'custom/button.js',
  'custom/path.js',
  // Error handling
  'error/errorOverlay.js',
  // Fynix core
  'fynix/index.js',
  // All hooks
  'hooks/nixAsync.js',
  'hooks/nixAsyncCache.js',
  'hooks/nixAsyncDebounce.js',
  'hooks/nixAsyncQuery.js',
  'hooks/nixCallback.js',
  'hooks/nixComputed.js',
  'hooks/nixDebounce.js',
  'hooks/nixEffect.js',
  'hooks/nixForm.js',
  'hooks/nixFormAsync.js',
  'hooks/nixInterval.js',
  'hooks/nixLazy.js',
  'hooks/nixLazyAsync.js',
  'hooks/nixLazyFormAsync.js',
  'hooks/nixLocalStorage.js',
  'hooks/nixMemo.js',
  'hooks/nixPrevious.js',
  'hooks/nixRef.js',
  'hooks/nixState.js',
  'hooks/nixStore.js',
  // Plugins
  'plugins/vite-plugin-res.js',
  // Router
  'router/router.js',
];

esbuild.build({
  entryPoints: entryPoints.map(f => path.join(__dirname, f)),
  outdir: path.join(__dirname, 'dist'),
  bundle: false, // Set to true if you want to bundle everything into one file
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  target: ['es2020'],
  splitting: false, // Set to true if bundle:true and multiple entry points
  outbase: __dirname, // Preserve folder structure
}).catch(() => process.exit(1));
