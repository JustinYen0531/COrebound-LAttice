import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
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
        main: resolve(__dirname, "index.html"),
        totem: resolve(__dirname, "totem-preview.html"),
      },
    },
  },
});
