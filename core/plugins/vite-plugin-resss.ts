import { transform, type TransformOptions } from "esbuild";
import type { HmrContext } from "vite";
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
  error?: (error: { message: string; stack?: string; id?: string }) => void;
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

  return {
    name: "vite-plugin-fynix",
    enforce: "pre", // must be 'pre', 'post', or undefined

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
        const ctx = this as unknown as TransformContext;

        if (typeof ctx.error === "function") {
          ctx.error({
            message: `Failed to transform ${id}: ${err.message}`,
            stack: err.stack,
            id,
          });
        } else {
          throw err;
        }
        return null;
      }
    },

    handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;
      const normalizedFile = normalizePath(file);
      const shouldReload = include.some((ext) => normalizedFile.endsWith(ext));

      if (shouldReload) {
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
        esbuild: {
          jsxFactory,
          jsxFragment,
          jsxInject: `import { ${jsxFactory} } from '@fynixorg/ui'`,
        },
        optimizeDeps: {
          include: ["@fynixorg/ui"],
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
        `[vite-plugin-fynix] Initialized with JSX factory: ${jsxFactory}`
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
