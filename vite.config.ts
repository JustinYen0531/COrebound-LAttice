import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: "assets",
  server: {
    host: "127.0.0.1",
    port: 5500,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5500,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        weaving: "totem-weaving.html",
      },
    },
  },
});
