import { type TransformOptions } from "esbuild";
import type { HmrContext, ViteDevServer } from "vite";
interface FynixPluginOptions {
    jsxFactory?: string;
    jsxFragment?: string;
    include?: string[];
    exclude?: string[];
    sourcemap?: boolean;
    esbuildOptions?: Partial<TransformOptions>;
}
export default function fynixPlugin(options?: FynixPluginOptions): {
    name: string;
    enforce: "pre";
    configureServer(server: ViteDevServer): void;
    transform(code: string, id: string): Promise<{
        code: string;
        map: string | null;
    } | null>;
    handleHotUpdate(ctx: HmrContext): never[] | undefined;
    config(): {
        esbuild: false;
        optimizeDeps: {
            include: string[];
            esbuildOptions: {
                jsx: string;
                jsxFactory: string;
                jsxFragment: string;
            };
        };
        resolve: {
            extensions: string[];
        };
    };
    buildStart(): void;
};
export { fynixPlugin };
export type { FynixPluginOptions };
