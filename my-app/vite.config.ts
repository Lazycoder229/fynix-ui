// vite.config.js
import { fynixPlugin } from "@fynixorg/ui/plugins/vite-plugin-res";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // Ensure enforce is typed as "pre" | "post" | undefined if needed
    fynixPlugin({ typeCheck: true }),
    tailwindcss(),
  ],
});
