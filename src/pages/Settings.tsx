import { useRef, useState } from 'react'
import type { ThemePreference } from '@/types'
import { computeTotals } from '@/lib/calc'
import { formatMoney } from '@/lib/money'
import { isoDate } from '@/lib/date'
import { ImportError, parseImport, serializeExport } from '@/lib/transfer'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  IconAlert,
  IconDownload,
  IconInfo,
  IconMoon,
  IconRefresh,
  IconSettings,
  IconSun,
  IconUpload,
} from '@/components/icons'

const THEMES: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'system', label: 'Match device', icon: <IconSettings className="size-4" /> },
  { value: 'light', label: 'Light', icon: <IconSun className="size-4" /> },
  { value: 'dark', label: 'Dark', icon: <IconMoon className="size-4" /> },
]

export function Settings() {
  const { state, actions, storageName, storageError } = usePlanner()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const totals = computeTotals(state.products, state.settings.budget)
  const priceRecords = state.products.reduce(
    (total, product) => total + product.priceHistory.length,
    0,
  )
  const customCount = state.products.filter((product) => product.isCustom).length

  function handleExport() {
    const { hydrated: _hydrated, ...data } = state
    try {
      const blob = new Blob([serializeExport(data)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dubai-shopping-planner-${isoDate()}.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Backup downloaded.')
    } catch {
      toast.error('The export could not be created in this browser.')
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      const result = parseImport(text)
      actions.replaceData(result.data)
      toast.success(
        result.skipped > 0
          ? `Imported ${result.productCount} products (${result.skipped} skipped).`
          : `Imported ${result.productCount} products.`,
      )
    } catch (error) {
      const message =
        error instanceof ImportError
          ? error.message
          : 'That file could not be imported. Choose a backup exported from this app.'
      setImportError(message)
      toast.error('Import failed.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Appearance, backups and the data behind your planner.
        </p>
      </header>

      {storageError ? (
        <Card className="flex items-start gap-3 border-negative/30 bg-negative-soft p-4">
          <IconAlert className="mt-0.5 size-5 shrink-0 text-negative" />
          <p className="text-[13px] leading-relaxed text-ink-soft">{storageError}</p>
        </Card>
      ) : null}

      <section>
        <SectionHeading title="Appearance" />
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((option) => {
              const active = state.settings.theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => actions.setTheme(option.value)}
                  aria-pressed={active}
                  className={cx(
                    'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition',
                    active
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-line bg-surface text-ink-soft hover:border-line-strong',
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              )
            })}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Your data"
          hint="Everything is stored on this device — nothing is uploaded anywhere."
        />
        <Card className="divide-y divide-line">
          {[
            { label: 'Products', value: String(state.products.length) },
            { label: 'Custom products', value: String(customCount) },
            { label: 'Purchased', value: `${totals.purchasedCount} of ${totals.totalCount}` },
            { label: 'Price records', value: String(priceRecords) },
            { label: 'Budget', value: formatMoney(state.settings.budget) },
            { label: 'Spent', value: formatMoney(totals.actualTotal) },
            { label: 'Storage', value: storageName },
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="text-[13.5px] text-ink-soft">{row.label}</dt>
              <dd className="tnum text-[14px] font-semibold text-ink">{row.value}</dd>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Backup & restore"
          hint="Export before clearing your browser data, or to move to another phone."
        />
        <Card className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport} size="lg">
              <IconDownload className="size-4" />
              Export JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              id="import-file"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
            <Button variant="secondary" size="lg" onClick={() => fileRef.current?.click()}>
              <IconUpload className="size-4" />
              Import JSON
            </Button>
          </div>

          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            An export contains every product, purchase, price record, price history entry, custom
            product and your budget. Importing replaces what is currently in the app.
          </p>

          {importError ? (
            <p
              role="alert"
              className="rounded-xl bg-negative-soft px-3.5 py-2.5 text-[13px] font-medium text-negative"
            >
              {importError}
            </p>
          ) : null}
        </Card>
      </section>

      <section>
        <SectionHeading title="Reset" />
        <Card className="space-y-3 p-4 sm:p-5">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Restore the original Dubai plan. This deletes your custom products, purchases and every
            price you have logged. Export a backup first if you might want it back.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={confirmingReset ? 'danger' : 'secondary'}
              size="lg"
              onClick={() => {
                if (!confirmingReset) {
                  setConfirmingReset(true)
                  return
                }
                actions.resetToSeed()
                setConfirmingReset(false)
                toast.success('Planner reset to the original Dubai plan.')
              }}
            >
              <IconRefresh className="size-4" />
              {confirmingReset ? 'Tap again to confirm reset' : 'Reset to the default plan'}
            </Button>
            {confirmingReset ? (
              <Button variant="ghost" size="lg" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading title="About the prices" />
        <Card className="flex items-start gap-3 p-4">
          <IconInfo className="mt-0.5 size-5 shrink-0 text-brand" />
          <div className="space-y-2 text-[13px] leading-relaxed text-ink-soft">
            <p>
              <span className="font-semibold text-ink">No live price feed is connected.</span> Every
              preloaded figure is a planning estimate from before the trip, not a guaranteed Dubai
              price. Targets, deals and totals are calculated only from prices you record yourself.
            </p>
            <p>
              Built-in product artwork is illustration, drawn for this app. It is not a photo of any
              specific item on sale. Upload your own photo on any product to replace it.
            </p>
            <p className="text-ink-muted">
              The data layer is isolated behind a storage adapter, so a real pricing API or a hosted
              database can be added later without changing the screens.
            </p>
          </div>
        </Card>
      </section>
    </div>
  )
}
