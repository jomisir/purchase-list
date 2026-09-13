import { describe, expect, it } from 'vitest'
import { allCurrencies, currencyInfo, isKnownCurrency, searchCurrencies } from '@/lib/currency'
import { formatMoney, formatNumber, roundMoney } from '@/lib/money'

describe('the currency list', () => {
  it('covers the world, not a hand-picked handful', () => {
    const list = allCurrencies()
    expect(list.length).toBeGreaterThan(100)
    for (const code of ['AED', 'USD', 'EUR', 'GBP', 'JPY', 'INR', 'KWD', 'NGN', 'VND', 'ZAR']) {
      expect(list.some((entry) => entry.code === code)).toBe(true)
    }
  })

  it('is sorted by name and free of duplicates', () => {
    const list = allCurrencies()
    expect(new Set(list.map((entry) => entry.code)).size).toBe(list.length)
    const names = list.map((entry) => entry.name)
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
  })

  it('knows each currency’s real minor units', () => {
    expect(currencyInfo('JPY').digits).toBe(0)
    expect(currencyInfo('USD').digits).toBe(2)
    expect(currencyInfo('KWD').digits).toBe(3)
    expect(currencyInfo('BHD').digits).toBe(3)
  })

  it('survives an unknown code instead of throwing', () => {
    const info = currencyInfo('ZZZ')
    expect(info.code).toBe('ZZZ')
    expect(isKnownCurrency('ZZZ')).toBe(false)
    expect(isKnownCurrency('usd')).toBe(true)
  })
})

describe('currency search', () => {
  it('puts trip-relevant currencies first when the query is empty', () => {
    expect(searchCurrencies('').slice(0, 3).map((entry) => entry.code)).toEqual(['AED', 'USD', 'EUR'])
  })

  it('matches on code and on name', () => {
    expect(searchCurrencies('eur')[0].code).toBe('EUR')
    expect(searchCurrencies('rupee').some((entry) => entry.code === 'INR')).toBe(true)
    expect(searchCurrencies('dirham').some((entry) => entry.code === 'AED')).toBe(true)
  })

  it('returns nothing for nonsense', () => {
    expect(searchCurrencies('qqqqzzz')).toEqual([])
  })
})

describe('formatting money in any currency', () => {
  it('shows decimals only when the amount has them', () => {
    expect(formatMoney(1550, 'AED')).toContain('1,550')
    expect(formatMoney(1550, 'AED')).not.toContain('.00')
    expect(formatMoney(22.5, 'AED')).toContain('22.50')
  })

  it('respects currencies with no minor unit', () => {
    const yen = formatMoney(1234.6, 'JPY')
    expect(yen).not.toContain('.')
    expect(yen).toContain('1,235')
  })

  it('respects three-decimal currencies', () => {
    expect(formatMoney(1.234, 'KWD')).toContain('1.234')
  })

  it('marks negatives and never shows a bare minus-hyphen', () => {
    expect(formatMoney(-320, 'AED').startsWith('−')).toBe(true)
  })

  it('handles missing values and unknown codes gracefully', () => {
    expect(formatMoney(null, 'AED')).toBe('—')
    expect(formatMoney(Number.NaN, 'USD')).toBe('—')
    expect(formatMoney(10, 'ZZZ')).toContain('10')
  })

  it('rounds to the currency’s own precision', () => {
    expect(roundMoney(1234.6, 'JPY')).toBe(1235)
    expect(roundMoney(1.23456, 'KWD')).toBe(1.235)
    expect(formatNumber(1234.5, 'JPY')).toBe('1,235')
  })

  it('rounds half-up despite binary floating point', () => {
    // 1.005 * 100 is 100.49999999999999, which rounds the wrong way naively.
    expect(roundMoney(1.005, 'USD')).toBe(1.01)
    expect(roundMoney(8.165, 'USD')).toBe(8.17)
    expect(roundMoney(-1.005, 'USD')).toBe(-1)
    expect(roundMoney(0, 'USD')).toBe(0)
  })

  it('survives non-finite and exponential values', () => {
    expect(roundMoney(Number.NaN, 'USD')).toBeNaN()
    expect(roundMoney(Number.POSITIVE_INFINITY, 'USD')).toBe(Number.POSITIVE_INFINITY)
    // Values written in exponential form take the fallback path, not the
    // string-shift one, and must still come back finite.
    expect(roundMoney(1e-8, 'USD')).toBe(0)
    expect(Number.isFinite(roundMoney(1e21, 'USD'))).toBe(true)
  })
})
