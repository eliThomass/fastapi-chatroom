import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,     // listen on all interfaces so Cloudflare can reach it
    port: 5173,

    // Allow your tunnel hostnames explicitly (NO trailing slash)

    allowedHosts: ["localhost","127.0.0.1",".trycloudflare.com"],


    // Proxy API + WebSocket to FastAPI on 8000 (same-origin in the browser)
    proxy: {
      // 🔒 Use explicit prefixes so they always match
      "/token":   { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/users":   { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/gc":      { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/invites": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/sign_up": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },

    // HMR over Cloudflare HTTPS
    hmr: {
      protocol: "wss",
      clientPort: 443,
      // host omitted -> Vite uses window.location.hostname (the tunnel host)
    },
  },
});