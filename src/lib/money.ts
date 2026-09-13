import type { Currency } from '@/types'

/**
 * Formats a figure as `AED 1,550`. Fractions are only shown when they exist,
 * so whole-dirham prices stay clean.
 */
export function formatMoney(
  value: number | null | undefined,
  currency: Currency = 'AED',
  options: { sign?: boolean; compact?: boolean } = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const hasFraction = Math.round(abs * 100) % 100 !== 0
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(options.compact ? abs : abs)
  const sign = value < 0 ? '−' : options.sign ? '+' : ''
  return `${sign}${currency} ${formatted}`
}

/** Bare number with thousands separators, for places that label the currency separately. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const hasFraction = Math.round(Math.abs(value) * 100) % 100 !== 0
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
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

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
