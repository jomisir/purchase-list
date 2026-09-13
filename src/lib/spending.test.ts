import { describe, expect, it } from 'vitest'
import { spendingSeries } from '@/lib/spending'
import { makeProduct } from '@/lib/testUtils'
import type { ExchangeRates } from '@/types'

const rates: ExchangeRates = {
  base: 'AED',
  values: { AED: 1, USD: 0.25 },
  updatedAt: '2026-09-13T00:00:00.000Z',
  source: 'api',
  overrides: {},
}

const bought = (day: string, amount: number, extra = {}) =>
  makeProduct({
    purchased: true,
    actualPrice: amount,
    purchasedAt: `${day}T12:00:00.000Z`,
    ...extra,
  })

describe('spendingSeries', () => {
  it('is empty until something is actually bought', () => {
    const series = spendingSeries([makeProduct(), makeProduct({ purchased: false })], 'AED', rates)
    expect(series.points).toEqual([])
    expect(series.total).toBe(0)
    expect(series.busiest).toBeNull()
  })

  it('ignores an item marked bought with no price recorded', () => {
    const series = spendingSeries(
      [makeProduct({ purchased: true, actualPrice: null, purchasedAt: '2026-09-10T10:00:00Z' })],
      'AED',
      rates,
    )
    expect(series.points).toEqual([])
  })

  it('accumulates day by day', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 100), bought('2026-09-11', 50), bought('2026-09-11', 25)],
      'AED',
      rates,
      '2026-09-11',
    )
    // A zero point is prepended so the area rises from the baseline.
    expect(series.points[0].total).toBe(0)
    expect(series.points.map((p) => p.total)).toEqual([0, 100, 175])
    expect(series.total).toBe(175)
  })

  it('fills quiet days so the axis stays proportional to real time', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 100), bought('2026-09-13', 40)],
      'AED',
      rates,
      '2026-09-13',
    )
    expect(series.points.map((p) => p.date)).toEqual([
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ])
    // The running total holds flat across the quiet days rather than dipping.
    expect(series.points.map((p) => p.total)).toEqual([0, 100, 100, 100, 140])
    expect(series.points[2].daySpend).toBe(0)
  })

  it('extends to today even when the last purchase was earlier', () => {
    const series = spendingSeries([bought('2026-09-10', 100)], 'AED', rates, '2026-09-12')
    expect(series.points[series.points.length - 1].date).toBe('2026-09-12')
    expect(series.points[series.points.length - 1].total).toBe(100)
    // daySpan counts purchase days, not the trailing quiet ones.
    expect(series.daySpan).toBe(1)
  })

  it('multiplies by quantity', () => {
    const series = spendingSeries([bought('2026-09-10', 50, { quantity: 3 })], 'AED', rates, '2026-09-10')
    expect(series.total).toBe(150)
  })

  it('converts a foreign-currency purchase into the home currency', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 100, { currency: 'USD' })],
      'AED',
      rates,
      '2026-09-10',
    )
    expect(series.total).toBeCloseTo(400, 6)
    expect(series.unconverted).toEqual([])
  })

  it('reports a purchase it cannot convert instead of counting it wrong', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 100), bought('2026-09-10', 5000, { name: 'Kyoto', currency: 'JPY' })],
      'AED',
      rates,
      '2026-09-10',
    )
    expect(series.total).toBe(100)
    expect(series.unconverted).toHaveLength(1)
    expect(series.unconverted[0]).toMatchObject({ name: 'Kyoto', currency: 'JPY' })
  })

  it('records what was bought each day, for the tooltip and table', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 100, { name: 'Charger' }), bought('2026-09-10', 20, { name: 'Belt' })],
      'AED',
      rates,
      '2026-09-10',
    )
    const day = series.points.find((p) => p.date === '2026-09-10')!
    expect(day.items.map((i) => i.name).sort()).toEqual(['Belt', 'Charger'])
    expect(day.daySpend).toBe(120)
  })

  it('finds the busiest day', () => {
    const series = spendingSeries(
      [bought('2026-09-10', 30), bought('2026-09-11', 200), bought('2026-09-12', 10)],
      'AED',
      rates,
      '2026-09-12',
    )
    expect(series.busiest?.date).toBe('2026-09-11')
    expect(series.busiest?.daySpend).toBe(200)
  })

  it('falls back to lastUpdated when a purchase has no timestamp', () => {
    const series = spendingSeries(
      [
        makeProduct({
          purchased: true,
          actualPrice: 75,
          purchasedAt: null,
          lastUpdated: '2026-09-11T09:00:00.000Z',
        }),
      ],
      'AED',
      rates,
      '2026-09-11',
    )
    expect(series.total).toBe(75)
  })

  it('drops the gap filling over a very long span', () => {
    const series = spendingSeries(
      [bought('2025-01-01', 10), bought('2026-09-10', 20)],
      'AED',
      rates,
      '2026-09-10',
    )
    // Two purchases plus the leading zero, not 600-odd daily points.
    expect(series.points).toHaveLength(3)
    expect(series.total).toBe(30)
  })
})
