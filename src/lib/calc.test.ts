import { describe, expect, it } from 'vitest'
import {
  bestKnownPrice,
  categoryTotals,
  budgetStatusFor,
  computeTotals,
  dealStatus,
  lineActual,
  lineEstimate,
  matchesSearch,
  matchesStatus,
  priceDifference,
  priceStats,
  sortProducts,
  storeComparison,
  targetDifference,
} from '@/lib/calc'
import { makeProduct, makeRecord } from '@/lib/testUtils'

describe('line maths', () => {
  it('multiplies unit prices by quantity', () => {
    const product = makeProduct({ estimatedPrice: 90, quantity: 5 })
    expect(lineEstimate(product)).toBe(450)
  })

  it('counts nothing as spent until an item is purchased', () => {
    const product = makeProduct({ actualPrice: 80, purchased: false, quantity: 2 })
    expect(lineActual(product)).toBe(0)
    expect(lineActual({ ...product, purchased: true })).toBe(160)
  })

  it('prefers paid price, then observed price, then the estimate', () => {
    const base = makeProduct({ estimatedPrice: 100 })
    expect(bestKnownPrice(base)).toBe(100)
    expect(bestKnownPrice({ ...base, currentPrice: 85 })).toBe(85)
    expect(bestKnownPrice({ ...base, currentPrice: 85, purchased: true, actualPrice: 70 })).toBe(70)
  })
})

describe('computeTotals', () => {
  it('matches the worked example from the brief', () => {
    const products = [
      makeProduct({ estimatedPrice: 3530, purchased: true, actualPrice: 1720 }),
      makeProduct({ estimatedPrice: 1720 }),
    ]
    const totals = computeTotals(products, 5500)
    expect(totals.estimatedTotal).toBe(5250)
    expect(totals.actualTotal).toBe(1720)
    expect(totals.remaining).toBe(3780)
    expect(Math.round(totals.percentUsed)).toBe(31)
  })

  it('reports completion from the number of purchased products', () => {
    const totals = computeTotals(
      [makeProduct({ purchased: true, actualPrice: 10 }), makeProduct(), makeProduct(), makeProduct()],
      1000,
    )
    expect(totals.purchasedCount).toBe(1)
    expect(totals.totalCount).toBe(4)
    expect(totals.completion).toBe(25)
  })

  it('goes negative when spending passes the budget, without clamping', () => {
    const totals = computeTotals(
      [makeProduct({ estimatedPrice: 500, purchased: true, actualPrice: 1320 })],
      1000,
    )
    expect(totals.remaining).toBe(-320)
    expect(totals.status).toBe('over')
  })

  it('projects the remaining spend using the best price known for each item', () => {
    const totals = computeTotals(
      [
        makeProduct({ estimatedPrice: 100, purchased: true, actualPrice: 80 }),
        makeProduct({ estimatedPrice: 200, currentPrice: 150 }),
        makeProduct({ estimatedPrice: 300 }),
      ],
      1000,
    )
    expect(totals.projectedTotal).toBe(80 + 150 + 300)
    expect(totals.varianceOnPurchased).toBe(-20)
  })

  it('still counts an item marked bought without a price at its estimate', () => {
    const totals = computeTotals(
      [makeProduct({ estimatedPrice: 250, purchased: true, actualPrice: null })],
      1000,
    )
    expect(totals.actualTotal).toBe(0)
    expect(totals.projectedTotal).toBe(250)
  })

  it('handles an empty plan and a zero budget', () => {
    expect(computeTotals([], 5500).completion).toBe(0)
    expect(computeTotals([], 0).percentUsed).toBe(0)
  })
})

describe('budget status thresholds', () => {
  it('warns from 80% and flags over budget past 100%', () => {
    expect(budgetStatusFor(79.9)).toBe('under')
    expect(budgetStatusFor(80)).toBe('approaching')
    expect(budgetStatusFor(100)).toBe('approaching')
    expect(budgetStatusFor(100.1)).toBe('over')
  })
})

describe('deal detection', () => {
  it('has no opinion without both a target and an observed price', () => {
    expect(dealStatus(makeProduct({ currentPrice: null }))).toBeNull()
    expect(dealStatus(makeProduct({ targetPrice: null, currentPrice: 50 }))).toBeNull()
  })

  it('labels great, good, at and above target', () => {
    expect(dealStatus(makeProduct({ targetPrice: 100, currentPrice: 90 }))).toBe('great')
    expect(dealStatus(makeProduct({ targetPrice: 100, currentPrice: 89 }))).toBe('great')
    expect(dealStatus(makeProduct({ targetPrice: 100, currentPrice: 95 }))).toBe('good')
    expect(dealStatus(makeProduct({ targetPrice: 100, currentPrice: 100 }))).toBe('at')
    expect(dealStatus(makeProduct({ targetPrice: 100, currentPrice: 101 }))).toBe('above')
  })

  it('judges a purchased item on what was actually paid', () => {
    const product = makeProduct({
      targetPrice: 1550,
      currentPrice: 1600,
      purchased: true,
      actualPrice: 1480,
    })
    expect(dealStatus(product)).toBe('good')
  })
})

describe('price differences', () => {
  it('reports the saving from the brief example', () => {
    const product = makeProduct({ estimatedPrice: 1550, purchased: true, actualPrice: 1480 })
    const difference = priceDifference(product)
    expect(difference).toEqual({ amount: -70, direction: 'saved', label: 'under estimate' })
  })

  it('reports overspend and uses line totals for multi-quantity items', () => {
    const product = makeProduct({
      estimatedPrice: 100,
      quantity: 2,
      purchased: true,
      actualPrice: 140,
    })
    expect(priceDifference(product)?.amount).toBe(80)
    expect(priceDifference(product)?.direction).toBe('over')
  })

  it('returns nothing before an item is bought', () => {
    expect(priceDifference(makeProduct({ actualPrice: 10 }))).toBeNull()
  })

  it('compares the observed price against the target', () => {
    expect(targetDifference(makeProduct({ targetPrice: 230, currentPrice: 229 }))).toBe(-1)
    expect(targetDifference(makeProduct({ currentPrice: null }))).toBeNull()
  })
})

describe('price history statistics', () => {
  const history = [
    makeRecord({ price: 249, date: '2026-09-10', store: 'Store A' }),
    makeRecord({ price: 235, date: '2026-09-11', store: 'Store B' }),
    makeRecord({ price: 229, date: '2026-09-12', store: 'Store C' }),
  ]

  it('finds lowest, highest, average and latest', () => {
    const stats = priceStats(history)
    expect(stats.lowest).toBe(229)
    expect(stats.highest).toBe(249)
    expect(stats.average).toBe(237.67)
    expect(stats.latest).toBe(229)
    expect(stats.lowestRecord?.store).toBe('Store C')
    expect(stats.count).toBe(3)
  })

  it('uses dates rather than insertion order for "latest"', () => {
    const stats = priceStats([
      makeRecord({ price: 100, date: '2026-09-20' }),
      makeRecord({ price: 300, date: '2026-09-02' }),
    ])
    expect(stats.latest).toBe(100)
  })

  it('is empty-safe', () => {
    expect(priceStats([])).toMatchObject({ lowest: null, highest: null, count: 0 })
  })
})

describe('store comparison', () => {
  it('keeps the cheapest sighting per store and sorts lowest first', () => {
    const product = makeProduct({
      priceHistory: [
        makeRecord({ price: 249, store: 'Store A' }),
        makeRecord({ price: 229, store: 'Store C' }),
        makeRecord({ price: 235, store: 'Store B' }),
        makeRecord({ price: 240, store: 'Store A' }),
      ],
    })
    const rows = storeComparison(product)
    expect(rows.map((row) => row.store)).toEqual(['Store C', 'Store B', 'Store A'])
    expect(rows[2].price).toBe(240)
  })

  it('groups records with no store under one row', () => {
    const product = makeProduct({
      priceHistory: [makeRecord({ price: 10 }), makeRecord({ price: 12 })],
    })
    expect(storeComparison(product)).toHaveLength(1)
    expect(storeComparison(product)[0].store).toBe('Unspecified store')
  })
})

describe('search, filters and sorting', () => {
  const iphone = makeProduct({ name: 'Used iPhone 14 Pro', brand: 'Apple', store: 'Sharaf DG' })

  it('matches on name, brand, category and store', () => {
    expect(matchesSearch(iphone, 'iphone')).toBe(true)
    expect(matchesSearch(iphone, 'apple')).toBe(true)
    expect(matchesSearch(iphone, 'electronics')).toBe(true)
    expect(matchesSearch(iphone, 'sharaf')).toBe(true)
    expect(matchesSearch(iphone, 'pro apple')).toBe(true)
    expect(matchesSearch(iphone, 'samsung')).toBe(false)
    expect(matchesSearch(iphone, '   ')).toBe(true)
  })

  it('filters by purchase and deal status', () => {
    const bought = makeProduct({ purchased: true, actualPrice: 10 })
    const overTarget = makeProduct({ targetPrice: 100, currentPrice: 120 })
    const deal = makeProduct({ targetPrice: 100, currentPrice: 80 })
    expect(matchesStatus(bought, 'bought')).toBe(true)
    expect(matchesStatus(bought, 'todo')).toBe(false)
    expect(matchesStatus(overTarget, 'overTarget')).toBe(true)
    expect(matchesStatus(deal, 'deals')).toBe(true)
    expect(matchesStatus(deal, 'overTarget')).toBe(false)
  })

  it('sorts by line value and by best price versus target', () => {
    const cheap = makeProduct({ estimatedPrice: 10 })
    const expensive = makeProduct({ estimatedPrice: 100 })
    const bulk = makeProduct({ estimatedPrice: 30, quantity: 5 })
    expect(sortProducts([expensive, cheap, bulk], 'priceAsc')[0]).toBe(cheap)
    expect(sortProducts([cheap, expensive, bulk], 'priceDesc')[0]).toBe(bulk)

    const bargain = makeProduct({ targetPrice: 100, currentPrice: 50 })
    const fair = makeProduct({ targetPrice: 100, currentPrice: 99 })
    const unpriced = makeProduct({ currentPrice: null })
    const sorted = sortProducts([unpriced, fair, bargain], 'bestVsTarget')
    expect(sorted[0]).toBe(bargain)
    expect(sorted[2]).toBe(unpriced)
  })

  it('leaves the planner order untouched by default', () => {
    const list = [makeProduct(), makeProduct(), makeProduct()]
    expect(sortProducts(list, 'default')).toEqual(list)
  })
})

describe('totals across several currencies', () => {
  const rates = {
    base: 'AED',
    values: { AED: 1, USD: 0.2723, EUR: 0.2509 },
    updatedAt: '2026-09-13T00:00:00.000Z',
    source: 'api' as const,
    overrides: {},
  }

  it('converts every line into the home currency', () => {
    const totals = computeTotals(
      [
        makeProduct({ estimatedPrice: 100, currency: 'AED' }),
        makeProduct({ estimatedPrice: 27.23, currency: 'USD' }),
      ],
      1000,
      'AED',
      rates,
    )
    // 27.23 USD is 100 AED, so the plan is 200 AED.
    expect(totals.estimatedTotal).toBeCloseTo(200, 2)
    expect(totals.currency).toBe('AED')
    expect(totals.unconverted).toEqual([])
  })

  it('gives the same answer whichever currency is the home one', () => {
    const products = [
      makeProduct({ estimatedPrice: 100, currency: 'AED' }),
      makeProduct({ estimatedPrice: 50, currency: 'USD' }),
    ]
    const inAed = computeTotals(products, 1000, 'AED', rates)
    const inUsd = computeTotals(products, 1000, 'USD', rates)
    expect(inUsd.estimatedTotal).toBeCloseTo(inAed.estimatedTotal * 0.2723, 2)
  })

  it('reports what it could not convert instead of under-reporting', () => {
    const totals = computeTotals(
      [
        makeProduct({ estimatedPrice: 100, currency: 'AED' }),
        makeProduct({ name: 'Yen thing', estimatedPrice: 5000, currency: 'JPY' }),
      ],
      1000,
      'AED',
      rates,
    )
    expect(totals.estimatedTotal).toBe(100)
    expect(totals.unconverted).toHaveLength(1)
    expect(totals.unconverted[0]).toMatchObject({ name: 'Yen thing', currency: 'JPY' })
  })

  it('still counts a purchased item it cannot convert towards completion', () => {
    const totals = computeTotals(
      [makeProduct({ currency: 'JPY', purchased: true, actualPrice: 500 })],
      1000,
      'AED',
      rates,
    )
    expect(totals.purchasedCount).toBe(1)
    expect(totals.completion).toBe(100)
    expect(totals.actualTotal).toBe(0)
  })

  it('needs no rates at all when everything shares the home currency', () => {
    const totals = computeTotals([makeProduct({ estimatedPrice: 100, currency: 'AED' })], 500, 'AED')
    expect(totals.estimatedTotal).toBe(100)
    expect(totals.unconverted).toEqual([])
  })

  it('converts category subtotals too', () => {
    const rows = categoryTotals(
      [
        makeProduct({ category: 'Electronics', estimatedPrice: 100, currency: 'AED' }),
        makeProduct({ category: 'Electronics', estimatedPrice: 27.23, currency: 'USD' }),
      ],
      'AED',
      rates,
    )
    expect(rows[0].estimated).toBeCloseTo(200, 2)
  })
})
