import type { Currency } from '@/types'
import { currencyInfo } from '@/lib/currency'

/**
 * Formats a figure for a given currency, e.g. `AED 1,550`, `$1,234.50`, `¥1,235`.
 *
 * Decimals appear only when the amount actually has them, but never more than
 * the currency allows — yen gets none, Kuwaiti dinar gets three.
 */
export function formatMoney(
  value: number | null | undefined,
  currency: Currency = 'AED',
  options: { sign?: boolean } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const { digits } = currencyInfo(currency)
  const abs = Math.abs(value)
  const factor = 10 ** digits
  const hasFraction = digits > 0 && Math.round(abs * factor) % factor !== 0

  let body: string
  try {
    body = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: hasFraction ? digits : 0,
      maximumFractionDigits: digits,
    }).format(abs)
  } catch {
    // Unknown code: still render something sensible rather than throwing.
    body = `${currency} ${new Intl.NumberFormat('en', {
      minimumFractionDigits: hasFraction ? digits : 0,
      maximumFractionDigits: digits,
    }).format(abs)}`
  }

  const sign = value < 0 ? '−' : options.sign ? '+' : ''
  return `${sign}${body}`
}

/** Bare number with separators, for places that label the currency separately. */
export function formatNumber(value: number | null | undefined, currency: Currency = 'AED'): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const { digits } = currencyInfo(currency)
  const factor = 10 ** digits
  const hasFraction = digits > 0 && Math.round(Math.abs(value) * factor) % factor !== 0
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: hasFraction ? digits : 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(fractionDigits)}%`
}

/**
 * Parses a user-typed price. Returns `null` for blank input and `NaN` for
 * anything that is not a usable number, so callers can tell the two apart.
 */
export function parsePrice(input: string): number | null | typeof NaN {
  const trimmed = input.trim().replace(/,/g, '')
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return NaN
  return value
}

/**
 * Rounds to the minor units the currency actually uses.
 *
 * Scaling by multiplication is not safe for money: `1.005 * 100` is
 * `100.49999999999999` in binary, so the naive version rounds a half-up case
 * down and quietly loses a cent. Shifting the exponent through the decimal
 * string representation avoids that.
 */
export function roundMoney(value: number, currency: Currency = 'AED'): number {
  if (!Number.isFinite(value)) return value
  const { digits } = currencyInfo(currency)
  const factor = 10 ** digits
  const text = String(value)
  // Values already in exponential form cannot take another exponent suffix.
  if (text.includes('e') || text.includes('E')) return Math.round(value * factor) / factor
  const shifted = Number(`${text}e${digits}`)
  if (!Number.isFinite(shifted)) return Math.round(value * factor) / factor
  const rounded = Math.round(shifted)
  if (digits === 0) return rounded
  const result = Number(`${rounded}e-${digits}`)
  return Number.isFinite(result) ? result : rounded / factor
}
