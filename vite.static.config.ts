/**
 * Compilación estática para GitHub Pages: genera dist-static/ con index.html y
 * sus archivos. No reemplaza la compilación normal (npm run build).
 * STATIC_BASE es la subruta del sitio, por ejemplo "/medidor-indicadores/".
 */
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  root: "static",
  base: process.env.STATIC_BASE ?? "./",
  resolve: { alias: { "@": src } },
  plugins: [react(), tailwindcss()],
  build: { outDir: "../dist-static", emptyOutDir: true },
});
