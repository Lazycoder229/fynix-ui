import { transformSync } from "@babel/core";
import babelPluginTransformReactJSX from "@babel/plugin-transform-react-jsx";

export function resPlugin() {
  return {
    name: "vite-plugin-res",

    // Handle `.res` files
    transform(code, id) {
      if (!id.endsWith(".res")) return null;

      //  Ensure Vite watches the file for changes
      this.addWatchFile(id);

      try {
        // Transform JSX → Fynix() calls
        const result = transformSync(code, {
          filename: id,
          plugins: [
            [
              babelPluginTransformReactJSX,
              {
                pragma: "Fynix",
                pragmaFrag: "Fynix.Fragment",
              },
            ],
          ],
          sourceMaps: true,
        });

        return {
          code: result.code,
          map: result.map,
        };
      } catch (err) {
        this.error(`[RestJS] Failed to transform ${id}: ${err.message}`);
      }
    },

    //  Ensure Hot Reload works for .res files
    handleHotUpdate(ctx) {
      const { file, server } = ctx;

      if (file.endsWith(".res") || file.endsWith(".js")) {
        server.ws.send({ type: "full-reload", path: "*" });
        return []; // ensures vite doesn’t continue its normal update path
      }
    },
  };
}
