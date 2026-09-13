import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { serviceWorkerPlugin } from './build/serviceWorkerPlugin'

// Relative base so the built app can be served from any sub-path
// (GitHub Pages, a static host, or straight off the filesystem).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // Files in public/ are copied verbatim, so they are not in the bundle graph.
    serviceWorkerPlugin({
      extraAssets: [
        'index.html',
        'manifest.webmanifest',
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-192.png',
        'icons/maskable-512.png',
        'icons/apple-touch-icon.png',
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
