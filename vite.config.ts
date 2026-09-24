import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ask before swapping in a new version so we never reload mid-quiz.
      registerType: 'prompt',
      injectRegister: false, // registered from <PWAUpdatePrompt />
      manifest: false, // shipped as public/manifest.webmanifest and linked from index.html
      workbox: {
        // App shell + static assets are precached (hashed filenames => no stale code).
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Only web fonts are cached at runtime. AI provider calls (cross-origin,
        // carry the user's API key) match no rule, so they always go straight to the network.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'memora-font-styles' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'memora-font-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
