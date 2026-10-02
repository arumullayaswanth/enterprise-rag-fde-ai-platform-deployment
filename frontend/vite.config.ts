import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the FastAPI backend so the browser makes
// same-origin requests in development and no CORS round-trip is needed. In
// production the built assets are served behind the same load balancer as the
// API, so the relative /api base keeps working unchanged.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: process.env.VITE_API_TARGET || "http://localhost:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
