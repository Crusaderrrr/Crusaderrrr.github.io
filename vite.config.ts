/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // User-site repo (Crusaderrrr.github.io) is served from the origin root.
  base: '/',
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Trust The Process',
        short_name: 'TTP',
        description: 'Personal offline workout tracker',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Without *.wasm the app opens offline but the DB never starts (SPEC §7).
        globPatterns: ['**/*.{js,css,html,wasm,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SW scope is the whole origin; don't hijack navigations to other Pages repos.
        navigateFallbackAllowlist: [/^\/$/, /^\/index\.html$/],
      },
    }),
  ],
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  test: { include: ['src/**/*.test.ts'] },
});
