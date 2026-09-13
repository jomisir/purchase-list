import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

/**
 * Emits a service worker that precaches exactly the files this build produced.
 *
 * Hand-rolled rather than pulled from a plugin because the app is small enough
 * that the whole thing fits in one precache list, and because every path has to
 * stay relative — the build runs with `base: './'` so it can be served from any
 * sub-path (a LAN address, GitHub Pages, a folder on a static host).
 */
export function serviceWorkerPlugin(options: { extraAssets?: string[] } = {}): Plugin {
  const extra = options.extraAssets ?? []

  return {
    name: 'dsp:service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const emitted = Object.keys(bundle).filter(
        (name) => !name.endsWith('.map') && name !== 'sw.js',
      )
      // Sorted so the same inputs always produce the same cache name.
      const precache = [...new Set(['.', ...emitted, ...extra])].sort()
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: renderServiceWorker(version, precache),
      })
    },
  }
}

function renderServiceWorker(version: string, precache: string[]): string {
  return `/* Generated at build time — do not edit. Build ${version}. */
const VERSION = '${version}'
const CACHE = 'dubai-shopping-planner-' + VERSION
const PRECACHE = ${JSON.stringify(precache, null, 2)}

// Resolve every precache entry against the worker's own scope so the app works
// from any sub-path without being rebuilt.
const scoped = (path) => new URL(path, self.registration.scope).toString()

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // addAll is all-or-nothing; one 404 must not leave the app uninstallable.
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            const request = new Request(scoped(path), { cache: 'reload' })
            const response = await fetch(request)
            if (response.ok) await cache.put(request, response)
          } catch {
            /* offline during install: the fetch handler will fill this in later */
          }
        }),
      )
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('dubai-shopping-planner-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      )
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  if (event.data === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION })
})

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false })
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // The app is a single HTML document with hash routing: every navigation is
  // served by the cached shell, which is what makes it work with no network.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse
          if (preloaded) return preloaded
          return await fetch(request)
        } catch {
          const shell = await caches.match(scoped('index.html'))
          return shell ?? (await caches.match(scoped('.'))) ?? Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    cacheFirst(request).catch(
      () => new Response('', { status: 504, statusText: 'Offline and not cached' }),
    ),
  )
})
`
}
