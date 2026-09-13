import type { Currency, ExchangeRates } from '@/types'

/**
 * Exchange rates.
 *
 * Speed is the point here: both providers serve a single small JSON document,
 * they are raced against each other, and whichever answers first wins. The
 * result is cached in the user's own data, so a phone with no signal still
 * shows the last known rates — stamped with when and where they came from,
 * never presented as live.
 */

/** Rates older than this are refreshed in the background on app start. */
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000
/** Give up on a provider well before a shopper would notice a hang. */
const REQUEST_TIMEOUT_MS = 6000

export interface RateProvider {
  id: string
  label: string
  url: (base: Currency) => string
  parse: (payload: unknown, base: Currency) => Record<string, number> | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeValues(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [code, value] of Object.entries(raw)) {
    const rate = typeof value === 'number' ? value : Number(value)
    // Codes are upper-cased so both providers land in the same shape.
    if (Number.isFinite(rate) && rate > 0 && /^[A-Za-z]{3}$/.test(code)) {
      out[code.toUpperCase()] = rate
    }
  }
  return out
}

export const PROVIDERS: RateProvider[] = [
  {
    id: 'currency-api',
    label: 'currency-api via jsDelivr',
    // A static file on a global CDN: usually the fastest of the two.
    url: (base) =>
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`,
    parse: (payload, base) => {
      const body = asRecord(payload)
      if (!body) return null
      const table = asRecord(body[base.toLowerCase()])
      return table ? normalizeValues(table) : null
    },
  },
  {
    id: 'open-er-api',
    label: 'open.er-api.com',
    url: (base) => `https://open.er-api.com/v6/latest/${base.toUpperCase()}`,
    parse: (payload) => {
      const body = asRecord(payload)
      if (!body) return null
      const table = asRecord(body.rates)
      return table ? normalizeValues(table) : null
    },
  },
]

export class RateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateError'
  }
}

async function fetchFrom(
  provider: RateProvider,
  base: Currency,
  signal: AbortSignal,
): Promise<{ values: Record<string, number>; provider: RateProvider }> {
  const response = await fetch(provider.url(base), { signal, cache: 'no-store' })
  if (!response.ok) throw new RateError(`${provider.label} returned ${response.status}`)
  const values = provider.parse(await response.json(), base)
  if (!values || Object.keys(values).length === 0) {
    throw new RateError(`${provider.label} returned no usable rates`)
  }
  return { values, provider }
}

export interface FetchResult {
  values: Record<string, number>
  provider: string
  updatedAt: string
}

/**
 * Races every provider and takes the first good answer, so the refresh is as
 * fast as the quickest one rather than as slow as the list.
 */
export async function fetchRates(
  base: Currency,
  options: { timeoutMs?: number; providers?: RateProvider[] } = {},
): Promise<FetchResult> {
  const providers = options.providers ?? PROVIDERS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS)

  try {
    const attempts = providers.map((provider) => fetchFrom(provider, base, controller.signal))
    const winner = await Promise.any(attempts)
    return {
      values: { ...winner.values, [base.toUpperCase()]: 1 },
      provider: winner.provider.label,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error instanceof AggregateError) {
      throw new RateError(
        'Could not reach a rate service. Check your connection, or set the rates by hand.',
      )
    }
    throw error instanceof RateError
      ? error
      : new RateError('Could not fetch exchange rates just now.')
  } finally {
    // Cancels the losers so they stop occupying the connection pool.
    clearTimeout(timer)
    controller.abort()
  }
}

export function emptyRates(base: Currency): ExchangeRates {
  return {
    base: base.toUpperCase(),
    values: { [base.toUpperCase()]: 1 },
    updatedAt: null,
    source: 'none',
    overrides: {},
  }
}

/** Merges a fetch result into stored rates, keeping any hand-typed overrides. */
export function applyFetch(current: ExchangeRates, result: FetchResult, base: Currency): ExchangeRates {
  const overrides = current.overrides ?? {}
  return {
    base: base.toUpperCase(),
    values: { ...result.values, ...overrides, [base.toUpperCase()]: 1 },
    updatedAt: result.updatedAt,
    source: Object.keys(overrides).length > 0 ? 'manual' : 'api',
    provider: result.provider,
    overrides,
  }
}

export function isStale(rates: ExchangeRates, now: number = Date.now()): boolean {
  if (!rates.updatedAt) return true
  const at = Date.parse(rates.updatedAt)
  if (Number.isNaN(at)) return true
  return now - at > STALE_AFTER_MS
}

/** Rate for one unit of `code` expressed in the rates' base currency. */
export function rateToBase(rates: ExchangeRates, code: Currency): number | null {
  const upper = code.toUpperCase()
  if (upper === rates.base.toUpperCase()) return 1
  const perBase = rates.values[upper]
  if (!Number.isFinite(perBase) || perBase <= 0) return null
  return 1 / perBase
}

/**
 * Converts between any two currencies. Returns `null` when a rate is missing so
 * callers can say so instead of inventing a number.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates,
): number | null {
  if (!Number.isFinite(amount)) return null
  const source = from.toUpperCase()
  const target = to.toUpperCase()
  if (source === target) return amount

  const fromInBase = rateToBase(rates, source)
  const toInBase = rateToBase(rates, target)
  if (fromInBase == null || toInBase == null) return null
  return (amount * fromInBase) / toInBase
}

/** Re-bases stored rates when the user changes their home currency. */
export function rebase(rates: ExchangeRates, nextBase: Currency): ExchangeRates {
  const target = nextBase.toUpperCase()
  if (target === rates.base.toUpperCase()) return rates
  const factor = rates.values[target]
  if (!Number.isFinite(factor) || factor <= 0) {
    // No rate for the new base: start clean rather than derive nonsense.
    return { ...emptyRates(target), overrides: rates.overrides ?? {} }
  }
  const values: Record<string, number> = {}
  for (const [code, perOldBase] of Object.entries(rates.values)) {
    if (!Number.isFinite(perOldBase) || perOldBase <= 0) continue
    values[code] = perOldBase / factor
  }
  values[target] = 1
  return { ...rates, base: target, values }
}
