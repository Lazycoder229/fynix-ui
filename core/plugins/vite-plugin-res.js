
import { transform } from "esbuild";
export function fynix() {
  return {
    name: "vite-plugin-res",
    enforce: "pre",

    async transform(code, id) {
      if (!id.includes("/src/")) return null;
      if (!id.endsWith(".js") && !id.endsWith(".jsx") && !id.endsWith(".fnx")) return null;
      this.addWatchFile(id);

      const result = await transform(code, {
        loader: "jsx",
        jsxFactory: "Fynix",
        jsxFragment: "Fynix.Fragment",
        sourcemap: true,
        sourcefile: id,
      });

      return {
        code: result.code,
        map: result.map,
      };
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".fnx")) {
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}
