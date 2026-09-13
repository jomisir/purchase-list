import { useState } from 'react'
import { promptInstall } from '@/lib/pwa'
import { useInstallState } from '@/hooks/useInstallState'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconCheck, IconDownload, IconInfo, IconPlus, IconUpload } from '@/components/icons'

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[13.5px] leading-relaxed text-ink-soft">
      <span className="tnum mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-ink">
        {index}
      </span>
      <span>{children}</span>
    </li>
  )
}

/**
 * Installation help. The browser only offers a one-tap install on Android and
 * desktop Chromium; iOS has to go through the Share sheet, so it gets written
 * instructions instead of a button that would do nothing.
 */
export function InstallPanel() {
  const { installed, canPrompt, needsIosInstructions, insecureContext } = useInstallState()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  if (installed) {
    return (
      <Card className="flex items-start gap-3 border-positive/30 bg-positive-soft p-4">
        <IconCheck className="mt-0.5 size-5 shrink-0 text-positive" />
        <div className="text-[13px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-positive">Installed on this device.</p>
          <p className="mt-1">
            The planner is running from your home screen and works with no signal — useful in a mall
            basement. Your list is stored on this device only.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Add the planner to your home screen and it opens like a normal app — full screen, no browser
        bar, and it keeps working with no connection.
      </p>

      {canPrompt ? (
        <Button
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const outcome = await promptInstall()
            setBusy(false)
            if (outcome === 'accepted') toast.success('Installing — check your home screen.')
            else if (outcome === 'dismissed') toast.info('Install cancelled. You can do it any time.')
            else toast.error('Your browser did not offer an install this time.')
          }}
        >
          <IconDownload className="size-4" />
          {busy ? 'Installing…' : 'Install on this device'}
        </Button>
      ) : null}

      {needsIosInstructions ? (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Install on iPhone or iPad</h3>
          <ol className="space-y-2">
            <Step index={1}>
              Open this page in <span className="font-semibold text-ink">Safari</span> — Chrome on
              iOS cannot add to the home screen.
            </Step>
            <Step index={2}>
              Tap the <span className="font-semibold text-ink">Share</span> button{' '}
              <IconUpload className="mb-0.5 inline size-4" aria-label="Share" /> in the toolbar.
            </Step>
            <Step index={3}>
              Scroll down and choose{' '}
              <span className="font-semibold text-ink">Add to Home Screen</span>{' '}
              <IconPlus className="mb-0.5 inline size-4" aria-hidden="true" />.
            </Step>
            <Step index={4}>
              Tap <span className="font-semibold text-ink">Add</span>. The planner appears on your
              home screen and opens full screen.
            </Step>
          </ol>
        </div>
      ) : null}

      {!canPrompt && !needsIosInstructions ? (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Install from your browser menu</h3>
          <ol className="space-y-2">
            <Step index={1}>
              <span className="font-semibold text-ink">Android / Chrome:</span> menu (⋮) →{' '}
              <span className="font-semibold text-ink">Add to Home screen</span> or{' '}
              <span className="font-semibold text-ink">Install app</span>.
            </Step>
            <Step index={2}>
              <span className="font-semibold text-ink">Desktop Chrome or Edge:</span> the install
              icon at the right-hand end of the address bar.
            </Step>
          </ol>
        </div>
      ) : null}

      {insecureContext ? (
        <div className="flex items-start gap-3 rounded-xl bg-caution-soft px-3.5 py-3">
          <IconInfo className="mt-0.5 size-4.5 shrink-0 text-caution" />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-caution">
              This page is not on a secure (https) address.
            </span>{' '}
            You can still add it to your home screen and your data is still saved on this device,
            but it cannot cache itself for offline use until it is served over https. See the README
            for two ways to do that.
          </p>
        </div>
      ) : null}
    </Card>
  )
}
