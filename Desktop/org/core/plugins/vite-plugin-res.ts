import { transform, type TransformOptions } from "esbuild";
import type { HmrContext, ViteDevServer } from "vite";
import { normalizePath } from "vite";

/**
 * Vite plugin options for Fynix
 */
interface FynixPluginOptions {
  /**
   * JSX factory function name
   * @default "Fynix"
   */
  jsxFactory?: string;

  /**
   * JSX fragment factory name
   * @default "Fynix.Fragment"
   */
  jsxFragment?: string;

  /**
   * File extensions to transform
   * @default [".ts", ".js", ".jsx", ".tsx", ".fnx"]
   */
  include?: string[];

  /**
   * Paths to exclude from transformation
   * @default ["node_modules"]
   */
  exclude?: string[];

  /**
   * Enable source maps
   * @default true
   */
  sourcemap?: boolean;

  /**
   * Custom esbuild transform options
   */
  esbuildOptions?: Partial<TransformOptions>;
}

/**
 * Extended context type that includes Vite's transform context methods
 */
interface TransformContext {
  addWatchFile?: (id: string) => void;
}

/**
 * Vite plugin for Fynix framework
 * Transforms JSX/TSX files using esbuild with custom JSX pragma
 */
export default function fynixPlugin(options: FynixPluginOptions = {}) {
  const {
    jsxFactory = "Fynix",
    jsxFragment = "Fynix.Fragment",
    include = [".ts", ".js", ".jsx", ".tsx", ".fnx"],
    exclude = ["node_modules"],
    sourcemap = true,
    esbuildOptions = {},
  } = options;

  let viteServer: ViteDevServer | null = null;

  return {
    name: "vite-plugin-fynix",
    enforce: "pre" as const,

    /**
     * Capture the Vite dev server instance for sending
     * WebSocket messages (error overlays, reloads, etc.)
     */
    configureServer(server: ViteDevServer) {
      viteServer = server;
    },

    async transform(code: string, id: string) {
      const normalizedId = normalizePath(id);
      const shouldExclude = exclude.some((pattern) =>
        normalizedId.includes(pattern)
      );
      if (shouldExclude) return null;
      const shouldInclude = include.some((ext) => normalizedId.endsWith(ext));
      if (!shouldInclude) return null;

      // Type-safe way to access Vite context methods
      const ctx = this as unknown as TransformContext;
      if (typeof ctx.addWatchFile === "function") {
        ctx.addWatchFile(id);
      }

      try {
        let loader: TransformOptions["loader"] = "tsx";
        if (normalizedId.endsWith(".ts") || normalizedId.endsWith(".fnx")) {
          loader = "tsx";
        } else if (normalizedId.endsWith(".tsx")) {
          loader = "tsx";
        } else if (normalizedId.endsWith(".jsx")) {
          loader = "jsx";
        } else if (normalizedId.endsWith(".js")) {
          loader = "jsx";
        }

        const result = await transform(code, {
          loader,
          jsxFactory,
          jsxFragment,
          sourcemap,
          sourcefile: id,
          target: "esnext",
          format: "esm",
          ...esbuildOptions,
        });

        return {
          code: result.code,
          map: result.map || null,
        };
      } catch (error) {
        const err = error as Error;

        // Send error overlay to the browser via WebSocket
        // This shows the red error overlay in the browser instead of just logging to terminal
        if (viteServer) {
          viteServer.ws.send({
            type: "error",
            err: {
              message: err.message,
              stack: err.stack || "",
              plugin: "vite-plugin-fynix",
              id,
            },
          });
        }

        // Log to terminal as well
        console.error(`\x1b[32m[vite-plugin-fynix]\x1b[0m \x1b[31mFailed to transform ${id}:\x1b[0m`);
        console.error(err.message);

        // Return null instead of throwing so Vite's HMR pipeline
        // stays intact and can recover when the error is fixed
        return null;
      }
    },

    handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;
      const normalizedFile = normalizePath(file);
      const shouldReload = include.some((ext) => normalizedFile.endsWith(ext));

      if (shouldReload) {
        console.log(
          `\x1b[32m[vite-plugin-fynix]\x1b[0m HMR: full-reload triggered by ${normalizedFile}`
        );
        server.ws.send({
          type: "full-reload",
          path: "*",
        });
        return [];
      }

      return undefined;
    },

    config() {
      return {
        esbuild: false as const,
        optimizeDeps: {
          include: ["fynixui"],
          esbuildOptions: {
            jsx: "transform",
            jsxFactory,
            jsxFragment,
          },
        },
        resolve: {
          extensions: [".fnx", ".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      };
    },

    buildStart() {
      console.log(
        `\x1b[32m[vite-plugin-fynix]\x1b[0m Initialized with JSX factory: ${jsxFactory}`
      );
    },
  };
}

/**
 * Named export for convenience
 */
export { fynixPlugin };

/**
 * Export types for TypeScript users
 */
export type { FynixPluginOptions };
