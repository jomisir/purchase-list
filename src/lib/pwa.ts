/**
 * Progressive-web-app plumbing: service-worker registration, update
 * notification, and the install prompt.
 *
 * `beforeinstallprompt` can fire before React has mounted, so the listener is
 * attached at module load and the event is parked here for a hook to pick up.
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Listener = () => void

let deferredPrompt: InstallPromptEvent | null = null
const promptListeners = new Set<Listener>()

function notifyPromptListeners() {
  for (const listener of promptListeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own mini-infobar out of the way; the app offers
    // installation from Settings instead.
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    notifyPromptListeners()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notifyPromptListeners()
  })
}

export function getInstallPrompt(): InstallPromptEvent | null {
  return deferredPrompt
}

export function subscribeToInstallPrompt(listener: Listener): () => void {
  promptListeners.add(listener)
  return () => promptListeners.delete(listener)
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredPrompt
  if (!event) return 'unavailable'
  await event.prompt()
  const { outcome } = await event.userChoice
  // A prompt can only be shown once; the browser re-fires the event if declined.
  deferredPrompt = null
  notifyPromptListeners()
  return outcome
}

/** True when the app is running from the home screen rather than a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    iosStandalone === true
  )
}

/** iOS never fires `beforeinstallprompt`, so those users need instructions. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return true
  // iPadOS 13+ identifies as a Mac; touch points give it away.
  return /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}

/**
 * Service workers need a secure context. Over plain HTTP on a LAN address the
 * app still runs and still saves data — it just cannot cache itself offline.
 */
export function isSecureContextForInstall(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext
}

export interface ServiceWorkerHandle {
  /** Applies a waiting update and reloads. */
  applyUpdate: () => void
}

export function registerServiceWorker(onUpdateReady: (handle: ServiceWorkerHandle) => void): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  const swUrl = new URL('sw.js', document.baseURI)

  // React usually mounts after `load` has already fired, so waiting for that
  // event unconditionally would mean never registering at all.
  const whenIdle = (run: () => void) => {
    if (document.readyState === 'complete') run()
    else window.addEventListener('load', run, { once: true })
  }

  whenIdle(() => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        const announce = (worker: ServiceWorker) => {
          onUpdateReady({
            applyUpdate: () => {
              // The new worker takes over, then the page reloads into it.
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => window.location.reload(),
                { once: true },
              )
              worker.postMessage('SKIP_WAITING')
            },
          })
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          announce(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // A first install has no controller — nothing to tell the user about.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              announce(installing)
            }
          })
        })
      })
      .catch(() => {
        /* Offline, unsupported, or insecure context: the app works regardless. */
      })
  })
}
