import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  applyFetch,
  convert,
  emptyRates,
  fetchRates,
  isStale,
  rebase,
  STALE_AFTER_MS,
  type RateProvider,
} from '@/lib/rates'
import type { ExchangeRates } from '@/types'

/** AED base: 1 AED = 0.2723 USD = 0.2509 EUR = 22.7 INR. */
const rates: ExchangeRates = {
  base: 'AED',
  values: { AED: 1, USD: 0.2723, EUR: 0.2509, INR: 22.7 },
  updatedAt: '2026-09-13T00:00:00.000Z',
  source: 'api',
  provider: 'test',
  overrides: {},
}

afterEach(() => vi.unstubAllGlobals())

describe('convert', () => {
  it('is a no-op between identical currencies, whatever the case', () => {
    expect(convert(100, 'AED', 'AED', rates)).toBe(100)
    expect(convert(100, 'aed', 'AED', rates)).toBe(100)
  })

  it('converts from and to the base', () => {
    expect(convert(100, 'AED', 'USD', rates)).toBeCloseTo(27.23, 6)
    expect(convert(27.23, 'USD', 'AED', rates)).toBeCloseTo(100, 6)
  })

  it('converts between two non-base currencies', () => {
    // 100 USD -> AED -> INR
    const viaBase = (100 / 0.2723) * 22.7
    expect(convert(100, 'USD', 'INR', rates)).toBeCloseTo(viaBase, 6)
  })

  it('round-trips without drift', () => {
    const there = convert(1234.56, 'EUR', 'INR', rates)!
    expect(convert(there, 'INR', 'EUR', rates)).toBeCloseTo(1234.56, 6)
  })

  it('returns null rather than guessing when a rate is missing', () => {
    expect(convert(10, 'AED', 'JPY', rates)).toBeNull()
    expect(convert(10, 'JPY', 'AED', rates)).toBeNull()
    expect(convert(10, 'AED', 'USD', emptyRates('AED'))).toBeNull()
  })

  it('rejects a non-finite amount', () => {
    expect(convert(Number.NaN, 'AED', 'USD', rates)).toBeNull()
  })
})

describe('rebase', () => {
  it('re-expresses every rate against a new base', () => {
    const inUsd = rebase(rates, 'USD')
    expect(inUsd.base).toBe('USD')
    expect(inUsd.values.USD).toBe(1)
    // Conversions must survive the change of base unchanged.
    expect(convert(100, 'AED', 'INR', inUsd)).toBeCloseTo(convert(100, 'AED', 'INR', rates)!, 6)
    expect(convert(50, 'EUR', 'AED', inUsd)).toBeCloseTo(convert(50, 'EUR', 'AED', rates)!, 6)
  })

  it('is a no-op when the base already matches', () => {
    expect(rebase(rates, 'AED')).toBe(rates)
  })

  it('starts clean when there is no rate for the new base', () => {
    const result = rebase(rates, 'JPY')
    expect(result.base).toBe('JPY')
    expect(result.values).toEqual({ JPY: 1 })
    expect(result.source).toBe('none')
  })
})

describe('staleness', () => {
  it('treats missing or unparseable timestamps as stale', () => {
    expect(isStale(emptyRates('AED'))).toBe(true)
    expect(isStale({ ...rates, updatedAt: 'not a date' })).toBe(true)
  })

  it('goes stale only after the window', () => {
    const now = Date.parse('2026-09-13T00:00:00.000Z')
    expect(isStale(rates, now + STALE_AFTER_MS - 1000)).toBe(false)
    expect(isStale(rates, now + STALE_AFTER_MS + 1000)).toBe(true)
  })
})

describe('fetchRates', () => {
  const slow: RateProvider = {
    id: 'slow',
    label: 'Slow provider',
    url: () => 'https://slow.example/rates',
    parse: () => ({ USD: 0.9 }),
  }
  const fast: RateProvider = {
    id: 'fast',
    label: 'Fast provider',
    url: () => 'https://fast.example/rates',
    parse: () => ({ USD: 0.2723, EUR: 0.2509 }),
  }

  it('takes the first provider to answer', async () => {
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      const body = { ok: true }
      if (url.includes('slow')) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(new Response(JSON.stringify(body), { status: 200 })), 150),
        )
      }
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
    })

    const result = await fetchRates('AED', { providers: [slow, fast] })
    expect(result.provider).toBe('Fast provider')
    expect(result.values.USD).toBe(0.2723)
    // The base is always present and always exactly 1.
    expect(result.values.AED).toBe(1)
  })

  it('falls through to a working provider when the first fails', async () => {
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('slow')) return Promise.resolve(new Response('nope', { status: 500 }))
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    })
    const result = await fetchRates('AED', { providers: [slow, fast] })
    expect(result.provider).toBe('Fast provider')
  })

  it('reports a useful error when every provider fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')))
    await expect(fetchRates('AED', { providers: [slow, fast] })).rejects.toThrow(
      /set the rates by hand/i,
    )
  })
})

describe('applyFetch', () => {
  it('keeps hand-typed overrides on top of fetched rates', () => {
    const current: ExchangeRates = { ...rates, overrides: { USD: 0.3 } }
    const merged = applyFetch(
      current,
      { values: { USD: 0.2723, EUR: 0.25 }, provider: 'test', updatedAt: 'now' },
      'AED',
    )
    expect(merged.values.USD).toBe(0.3)
    expect(merged.values.EUR).toBe(0.25)
    expect(merged.source).toBe('manual')
  })

  it('is marked as coming from the api when nothing is overridden', () => {
    const merged = applyFetch(
      emptyRates('AED'),
      { values: { USD: 0.2723 }, provider: 'test', updatedAt: 'now' },
      'AED',
    )
    expect(merged.source).toBe('api')
    expect(merged.provider).toBe('test')
  })
})
