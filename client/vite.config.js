import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  envDir: "../",
  server: {
    // Allow trycloudflare hostnames created by an ephemeral cloudflared tunnel
    allowedHosts: ["connections.nanosplitter.com", "connections-3wdu.onrender.com"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    hmr: {
      clientPort: 443
    }
  }
});
