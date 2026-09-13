import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/painel/",
  build: {
    outDir: "../painel/dist",
    emptyOutDir: true,
  },
  plugins: [react()],
});
