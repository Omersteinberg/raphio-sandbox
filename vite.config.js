import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow tunneled hosts (ngrok) to reach the dev server.
    // Leading dot matches any subdomain so the URL can change between sessions.
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
