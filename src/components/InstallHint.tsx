import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { promptInstall } from '@/lib/pwa'
import { useInstallState } from '@/hooks/useInstallState'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { IconClose, IconDownload } from '@/components/icons'

// Original key retained so a dismissal made before the rename still counts.
const DISMISS_KEY = 'dubai-shopping-planner/install-hint-dismissed'

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * A single, dismissible nudge to add the planner to the home screen. Shown only
 * when installing is actually possible, and never again once waved away.
 */
export function InstallHint() {
  const { installed, canPrompt, needsIosInstructions } = useInstallState()
  const toast = useToast()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* a remembered dismissal is a nicety, not a requirement */
    }
  }

  if (installed || dismissed || (!canPrompt && !needsIosInstructions)) return null

  return (
    <Card className="flex items-center gap-3 border-brand/25 bg-brand-soft/40 p-3.5 animate-fade-in">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
        <IconDownload className="size-4.5" />
      </span>

      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-soft">
        <span className="font-semibold text-ink">Add this to your home screen</span> to use it like
        an app while you shop — it keeps working with no signal.
      </p>

      {canPrompt ? (
        <button
          type="button"
          onClick={async () => {
            const outcome = await promptInstall()
            if (outcome === 'accepted') {
              toast.success('Installing — check your home screen.')
              dismiss()
            }
          }}
          className="h-9 shrink-0 rounded-full bg-brand px-4 text-[13px] font-semibold text-on-brand"
        >
          Install
        </button>
      ) : (
        <Link
          to="/settings"
          className="h-9 shrink-0 rounded-full border border-line bg-surface px-4 text-[13px] leading-9 font-semibold text-ink-soft"
        >
          How
        </Link>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install suggestion"
        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
      >
        <IconClose className="size-4" />
      </button>
    </Card>
  )
}
