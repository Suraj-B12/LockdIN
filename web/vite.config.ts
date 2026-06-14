import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the FastAPI backend during local dev so that the
      // default VITE_API_BASE of "/api" works without CORS gymnastics.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the big, stable vendor libs into their own long-cached chunks
        // so app updates don't bust them and the main chunk stays lean.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          data: ["@tanstack/react-query", "@supabase/supabase-js"],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // OneSignal coexistence (implemented):
      // Two service workers cannot both own the root scope. So instead of the
      // Workbox-*generated* SW we use `injectManifest` with a custom src/sw.ts
      // that (a) `importScripts` the OneSignal worker SDK and (b) precaches the
      // app shell + runtime-caches avatars. OneSignal is pointed at this same
      // worker file/scope in src/lib/onesignal.ts (serviceWorkerPath: "sw.js",
      // serviceWorkerOverrideForTypical: true) so only ONE SW is registered.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "mask-icon.svg"],
      // The precache glob now lives here for the injectManifest build. Avatars
      // (150 PNGs) are deliberately NOT precached — sw.ts runtime-caches them.
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        globIgnores: ["**/avatars/**"],
      },
      manifest: {
        name: "LockdIN",
        short_name: "LockdIN",
        description:
          "Track focused time, get honest productivity scores, and hold each other accountable with friends.",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "education", "lifestyle"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
