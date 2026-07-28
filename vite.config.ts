import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // AI/processing API lives server-side so gateway keys never reach the browser.
      "/api": "http://localhost:8791",
    },
  },
});
