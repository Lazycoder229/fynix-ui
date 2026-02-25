// vite.config.js
import { fynixPlugin } from "fynixui/plugins/vite-plugin-res";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    fynixPlugin(),
    tailwindcss(),
  ],
});
