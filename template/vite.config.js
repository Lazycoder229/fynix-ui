// vite.config.js
import { defineConfig } from "vite";
import { fynix } from "fynix-core/plugins/vite-plugin-res";
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
 
  plugins: [fynix(), tailwindcss(),],
 
  server: {
    hmr: {
      overlay: true,
    },
  },
});
