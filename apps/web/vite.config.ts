import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const MIDNIGHT = "#07090F";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Tanong402",
        short_name: "Tanong402",
        description: "Step-by-step AI tutor for Filipino students. Pay per question, not per month.",
        lang: "en-PH",
        theme_color: MIDNIGHT,
        background_color: MIDNIGHT,
        display: "standalone",
        orientation: "portrait",
        start_url: "/ask",
        scope: "/",
        categories: ["education"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // KaTeX ships woff/ttf too; browsers that run this service worker all take woff2.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/\.well-known\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { dedupe: ["react", "react-dom"] },
  server: { port: 5180, strictPort: true }, // 5173/5174 belong to another local project
  preview: { port: 4173 },
  build: { target: "es2022", chunkSizeWarningLimit: 2500 },
});
