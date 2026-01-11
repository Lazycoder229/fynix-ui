// vite.config.js
import { defineConfig } from "vite";
import { fynix } from "fynix-core/plugins/vite-plugin-res";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [fynix(), tailwindcss()],
  
    esbuild: {
      loader: 'jsx',
      include: /\.(ts|js|fnx)$/,
      jsxFactory: 'Fynix',
      jsxFragment: 'Fynix.Fragment',
    },
     optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      }
    }
  },
  
  server: {
    hmr: {
      overlay: true,
    },
  },
});
