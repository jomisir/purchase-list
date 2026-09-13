import { useEffect, useState } from 'react'
import { registerServiceWorker, type ServiceWorkerHandle } from '@/lib/pwa'
import { IconRefresh } from '@/components/icons'

/**
 * Registers the service worker and, when a newer build has been fetched in the
 * background, offers to switch to it. Never reloads on its own — that would
 * throw away whatever the user is in the middle of typing in a shop.
 */
export function UpdatePrompt() {
  const [handle, setHandle] = useState<ServiceWorkerHandle | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    registerServiceWorker((next) => setHandle(next))
  }, [])

  if (!handle || dismissed) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-4 shadow-pop animate-pop-in">
        <span className="text-[13px] font-medium text-ink">A new version is ready.</span>
        <button
          type="button"
          onClick={() => handle.applyUpdate()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-semibold text-on-brand"
        >
          <IconRefresh className="size-4" />
          Reload
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="h-9 rounded-full px-3 text-[13px] font-semibold text-ink-muted hover:bg-surface-muted"
        >
          Later
        </button>
      </div>
    </div>
  )
}
