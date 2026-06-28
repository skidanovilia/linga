import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and apply on next load — no prompt.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Generate every icon (favicon, PWA, maskable, apple-touch) from the single
      // source SVG, inject the <head> links + theme-color meta, and populate
      // manifest.icons. No separate CLI run; runs inside build/dev.
      pwaAssets: {
        preset: 'minimal-2023',
        image: 'public/favicon.svg',
        htmlPreset: '2023',
        injectThemeColor: true,
        overrideManifestIcons: true,
      },

      manifest: {
        id: '/',
        name: 'Linga',
        short_name: 'Linga',
        description: 'Practice Georgian with bite-sized challenges and memo cards.',
        theme_color: '#121212', // bauhaus ink (the nav band)
        background_color: '#f0f0f0', // bauhaus canvas (matches body bg)
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        // icons are populated automatically from pwaAssets
      },

      workbox: {
        // SPA deep-link fallback for offline navigations; mirrors the Vercel rewrite.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },

      // Lets us exercise SW registration during `vite dev`; real offline/install
      // testing should still use `vite build` + `vite preview`.
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
})
