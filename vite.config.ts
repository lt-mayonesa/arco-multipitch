import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/arco-multipitch/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        // Route photos are ~110MB total; precache the app shell + data only and let
        // photos be cached lazily on first view (still available offline afterwards).
        globPatterns: ["**/*.{js,css,html,svg,png,webp,json}"],
        globIgnores: ["photos/**/*"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/photos\/.*\.webp$/,
            handler: "CacheFirst",
            options: {
              cacheName: "route-photos",
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "Arco Multipitch",
        short_name: "Multipitch",
        description: "Multipitch route crib sheet for Arco / Sarca valley, sourced from howtoreachthesky.com",
        theme_color: "#20242c",
        background_color: "#16181d",
        display: "standalone",
        start_url: "/arco-multipitch/",
        scope: "/arco-multipitch/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
