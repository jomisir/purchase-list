/* Generated at build time — do not edit. Build 482f219010f2. */
const VERSION = '482f219010f2'
// Prefix unchanged since the rename so the activate step still recognises,
// and clears, caches written by earlier versions.
const CACHE = 'dubai-shopping-planner-' + VERSION
const PRECACHE = [
  ".",
  "assets/index-DbA05Ynk.css",
  "assets/index-S3_fQ4B3.js",
  "favicon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "index.html",
  "manifest.webmanifest"
]

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
