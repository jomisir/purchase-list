import { useMemo, useState } from 'react'
import type { Currency } from '@/types'
import { currencyInfo } from '@/lib/currency'
import { convert, isStale, STALE_AFTER_MS } from '@/lib/rates'
import { formatMoney, parsePrice } from '@/lib/money'
import { formatRelativeDay } from '@/lib/date'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { CurrencySelect } from '@/components/CurrencySelect'
import { Modal } from '@/components/ui/Modal'
import { IconAlert, IconCheck, IconInfo, IconRefresh, IconTrash } from '@/components/icons'

function relativeAge(updatedAt: string | null): string {
  if (!updatedAt) return 'never'
  const age = Date.now() - Date.parse(updatedAt)
  if (Number.isNaN(age)) return 'never'
  if (age < 60_000) return 'just now'
  if (age < 3_600_000) return `${Math.round(age / 60_000)} min ago`
  if (age < 86_400_000) return `${Math.round(age / 3_600_000)} h ago`
  return formatRelativeDay(updatedAt)
}

/** Home currency, live rate refresh, and hand-typed overrides. */
export function CurrencyPanel() {
  const { state, actions } = usePlanner()
  const toast = useToast()
  const { currency, rates, autoRefreshRates } = state.settings

  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Currency | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addCode, setAddCode] = useState('USD')
  const [addRate, setAddRate] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  // Currencies actually in play, so the table shows what matters rather than 160 rows.
  const inUse = useMemo(() => {
    const codes = new Set<string>()
    for (const product of state.products) {
      codes.add(product.currency.toUpperCase())
      for (const record of product.priceHistory) codes.add(record.currency.toUpperCase())
    }
    for (const code of Object.keys(rates.overrides ?? {})) codes.add(code)
    codes.delete(currency.toUpperCase())
    return [...codes].sort()
  }, [state.products, rates.overrides, currency])

  const stale = isStale(rates)

  async function refresh() {
    setBusy(true)
    const started = performance.now()
    const result = await actions.refreshRates()
    const elapsed = Math.round(performance.now() - started)
    setBusy(false)
    if (result.ok) toast.success(`${result.message} (${elapsed}ms)`)
    else toast.error(result.message)
  }

  function addOverride() {
    const parsed = parsePrice(addRate)
    if (parsed === null) return setAddError('Enter a rate.')
    if (Number.isNaN(parsed)) return setAddError('That rate is not a number.')
    if (parsed <= 0) return setAddError('A rate must be greater than zero.')
    actions.setRateOverride(addCode, parsed)
    toast.success(`Rate for ${addCode} set by hand.`)
    setAddOpen(false)
    setAddRate('')
    setAddError(null)
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <CurrencyPicker
        value={currency}
        onChange={(code) => {
          if (code.toUpperCase() === currency.toUpperCase()) return
          setPending(code)
        }}
      />

      <div className="rounded-2xl border border-line bg-surface-muted p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Exchange rates</p>
            <p className="tnum mt-0.5 text-[12px] text-ink-muted">
              {rates.updatedAt ? (
                <>
                  Updated {relativeAge(rates.updatedAt)}
                  {rates.provider ? ` · ${rates.provider}` : ''}
                  {rates.source === 'manual' ? ' · includes your edits' : ''}
                </>
              ) : (
                'No rates yet — needed only if you mix currencies.'
              )}
            </p>
          </div>
          <Button size="sm" onClick={refresh} disabled={busy}>
            <IconRefresh className={cx('size-4', busy && 'animate-spin')} />
            {busy ? 'Refreshing…' : 'Refresh now'}
          </Button>
        </div>

        {stale && rates.updatedAt ? (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-caution">
            <IconAlert className="mt-0.5 size-3.5 shrink-0" />
            These rates are more than {Math.round(STALE_AFTER_MS / 3_600_000)} hours old.
          </p>
        ) : null}

        <label className="mt-3 flex items-center gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={autoRefreshRates}
            onChange={(event) => actions.setAutoRefreshRates(event.target.checked)}
            className="size-4.5 accent-[var(--brand)]"
          />
          Refresh automatically in the background when they go stale
        </label>
      </div>

      {inUse.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-ink-soft">
              Rates against {currency}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              Set one by hand
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Exchange rate for each currency you use</caption>
              <thead className="bg-surface-muted text-[10.5px] tracking-[0.05em] text-ink-muted uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Currency</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">1 unit is</th>
                  <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {inUse.map((code) => {
                  const info = currencyInfo(code)
                  const value = convert(1, code, currency, rates)
                  const manual = Boolean(rates.overrides?.[code])
                  return (
                    <tr key={code} className="border-t border-line">
                      <th scope="row" className="px-3 py-2.5 font-medium text-ink">
                        <span className="tnum font-bold">{code}</span>
                        <span className="ml-2 text-ink-muted">{info.name}</span>
                        {manual ? (
                          <span className="ml-2 rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-semibold text-brand-ink">
                            yours
                          </span>
                        ) : null}
                      </th>
                      <td
                        className={cx(
                          'tnum px-3 py-2.5 text-right font-semibold',
                          value == null ? 'text-negative' : 'text-ink',
                        )}
                      >
                        {value == null ? 'no rate' : formatMoney(value, currency)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {manual ? (
                          <button
                            type="button"
                            onClick={() => actions.setRateOverride(code, null)}
                            aria-label={`Remove your manual rate for ${code}`}
                            className="grid size-8 place-items-center rounded-full text-ink-faint transition hover:bg-negative-soft hover:text-negative"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="flex items-start gap-2.5 rounded-xl bg-surface-muted px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          <IconInfo className="mt-0.5 size-4 shrink-0 text-brand" />
          Everything in your plan is priced in {currency}, so no conversion is needed. Rates only
          come into play once you record a price in another currency.
        </p>
      )}

      {/* Changing the home currency: convert the numbers, or just relabel. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={`Switch to ${pending ?? ''}?`}
        description="Your budget and every price are currently in a different currency."
      >
        {pending ? (
          <div className="space-y-3">
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              {convert(1, currency, pending, rates) == null ? (
                <>
                  There is no rate between {currency} and {pending} yet, so amounts cannot be
                  converted. Switching will change the label only — refresh the rates first if you
                  want the numbers converted.
                </>
              ) : (
                <>
                  Using the current rate,{' '}
                  <span className="font-semibold text-ink">
                    {formatMoney(state.settings.budget, currency)}
                  </span>{' '}
                  becomes{' '}
                  <span className="font-semibold text-ink">
                    {formatMoney(convert(state.settings.budget, currency, pending, rates), pending)}
                  </span>
                  .
                </>
              )}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => {
                  actions.setCurrency(pending, true)
                  toast.success(`Converted everything to ${pending}.`)
                  setPending(null)
                }}
                disabled={convert(1, currency, pending, rates) == null}
              >
                <IconCheck className="size-4" />
                Convert my amounts to {pending}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  actions.setCurrency(pending, false)
                  toast.info(`Now showing totals in ${pending}. Amounts were left as they were.`)
                  setPending(null)
                }}
              >
                Keep the numbers, just change the currency
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Hand-typed rate */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Set a rate by hand"
        description={`How much is one unit worth in ${currency}?`}
        footer={
          <Button size="lg" fullWidth onClick={addOverride}>
            Save rate
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Currency</span>
            <CurrencySelect
              label="Currency to set a rate for"
              value={addCode}
              onChange={setAddCode}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="manual-rate"
              className="mb-1.5 block text-[13px] font-semibold text-ink-soft"
            >
              1 {addCode} equals how many {currency}?
            </label>
            <input
              id="manual-rate"
              inputMode="decimal"
              value={addRate}
              onChange={(event) => {
                setAddRate(event.target.value)
                setAddError(null)
              }}
              placeholder="0.00"
              className="tnum w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
            />
            {addError ? (
              <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-negative">
                {addError}
              </p>
            ) : null}
            <p className="mt-1.5 text-[12.5px] text-ink-muted">
              A rate you set here survives every refresh until you remove it.
            </p>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
