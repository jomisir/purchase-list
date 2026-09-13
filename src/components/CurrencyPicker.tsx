import { useEffect, useMemo, useState } from 'react'
import type { Currency } from '@/types'
import { currencyInfo, searchCurrencies, SUGGESTED_CURRENCIES } from '@/lib/currency'
import { cx } from '@/lib/cx'
import { Modal } from '@/components/ui/Modal'
import { IconCheck, IconChevronDown, IconSearch } from '@/components/icons'

/**
 * Searchable picker for the home currency — worth the extra surface because
 * there are 160-odd options and the choice matters more than a per-price one.
 */
export function CurrencyPicker({
  value,
  onChange,
  label = 'Home currency',
}: {
  value: Currency
  onChange: (code: Currency) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const current = currencyInfo(value)

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const results = useMemo(() => searchCurrencies(query, 120), [query])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition hover:border-line-strong"
      >
        <span className="tnum grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-[13px] font-bold text-brand-ink">
          {current.symbol.length <= 2 ? current.symbol : current.code.slice(0, 3)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            {label}
          </span>
          <span className="block truncate text-[15px] font-semibold text-ink">
            {current.code} · {current.name}
          </span>
        </span>
        <IconChevronDown className="size-4 shrink-0 text-ink-muted" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a currency"
        description={`${results.length === 120 ? 'Showing the closest matches' : `${results.length} shown`} — search by code or name`}
      >
        <div className="relative mb-3">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-faint" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. EUR, rupee, ¥"
            aria-label="Search currencies"
            className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
          />
        </div>

        {results.length === 0 ? (
          <p className="px-1 py-8 text-center text-[13.5px] text-ink-muted">
            No currency matches “{query}”.
          </p>
        ) : (
          <ul className="-mx-1">
            {results.map((entry) => {
              const selected = entry.code === value.toUpperCase()
              return (
                <li key={entry.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(entry.code)
                      setOpen(false)
                    }}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      selected ? 'bg-brand-soft' : 'hover:bg-surface-muted',
                    )}
                  >
                    <span className="tnum w-12 shrink-0 text-[13px] font-bold text-ink-soft">
                      {entry.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{entry.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-muted">{entry.symbol}</span>
                    {selected ? <IconCheck className="size-4 shrink-0 text-brand" /> : null}
                  </button>
                </li>
              )
            })}
            {query === '' ? (
              <li className="px-3 pt-3 text-[11.5px] text-ink-faint">
                Common currencies first ({SUGGESTED_CURRENCIES.length}), then every other one.
              </li>
            ) : null}
          </ul>
        )}
      </Modal>
    </>
  )
}
