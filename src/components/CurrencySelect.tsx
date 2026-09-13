import { useMemo } from 'react'
import type { Currency } from '@/types'
import { allCurrencies, currencyInfo, SUGGESTED_CURRENCIES } from '@/lib/currency'
import { cx } from '@/lib/cx'

/**
 * Compact currency picker for use beside a price field. A native select is
 * deliberate: phones render it as their own wheel or sheet, which is faster to
 * use one-handed than anything reimplemented in the page.
 */
export function CurrencySelect({
  value,
  onChange,
  label,
  id,
  className,
  disabled,
}: {
  value: Currency
  onChange: (code: Currency) => void
  label: string
  id?: string
  className?: string
  disabled?: boolean
}) {
  const { suggested, rest } = useMemo(() => {
    const all = allCurrencies()
    const current = value.toUpperCase()
    const top = [...new Set([current, ...SUGGESTED_CURRENCIES])].map((code) => currencyInfo(code))
    const topCodes = new Set(top.map((entry) => entry.code))
    return { suggested: top, rest: all.filter((entry) => !topCodes.has(entry.code)) }
  }, [value])

  return (
    <select
      id={id}
      aria-label={label}
      value={value.toUpperCase()}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cx(
        'h-11 rounded-xl border border-line bg-surface px-2.5 text-[14px] font-semibold text-ink-soft',
        'focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none disabled:opacity-60',
        className,
      )}
    >
      <optgroup label="Common">
        {suggested.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.code} — {entry.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="All currencies">
        {rest.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.code} — {entry.name}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
