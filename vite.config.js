import { defineConfig } from "vite";
import { transformSync } from "esbuild";
import path from "path";
import { resPlugin } from "./vite-plugin-res";

export default defineConfig({
  //  Root points to your app's entry directory
  root: "app/View",

  resolve: {
    alias: {
      "@fynix": path.resolve(__dirname, "core/fynix"),
    },
  },

  plugins: [
    resPlugin(),
    {
      name: "treat-js-as-jsx",
      enforce: "pre",

      transform(code, id) {
        // Only transform your app’s JS files (exclude node_modules & Vite internals)
        if (
          id.endsWith(".js") &&
          !id.includes("node_modules") &&
          !id.includes("/@vite/")
        ) {
          try {
            return transformSync(code, {
              loader: "jsx",
              jsxFactory: "Fynix",
              jsxFragment: "Fynix.Fragment",
              target: "esnext",
            });
          } catch (err) {
            console.error(`[Fynix] JSX transform failed in ${id}:`, err);
            throw err;
          }
        }
      },
    },
  ],

  // Redundant but safe — ensures esbuild uses your JSX factory by default
  esbuild: {
    jsxFactory: "Fynix",
    jsxFragment: "Fynix.Fragment",
    loader: "jsx",
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },

  server: {
    hmr: { overlay: false },
  },
});
