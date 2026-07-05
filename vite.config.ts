import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    host: "127.0.0.1",
    port: 5600,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 5600,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
