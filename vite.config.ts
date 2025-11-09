import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Prefer explicit Vite var, then common fallbacks, finally default to 3006 (our server .env PORT)
  const backendPort = env.VITE_BACKEND_PORT || "3006";
  return {
    server: {
      // Bind to localhost to avoid IPv6-only edge cases causing proxy refused errors on Windows
      host: "localhost",
      port: 5173,
      headers: {
        // Suppress COOP/COEP warnings in Firebase Auth popups during local dev
        "Cross-Origin-Opener-Policy": "unsafe-none",
        "Cross-Origin-Embedder-Policy": "unsafe-none",
      },
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
