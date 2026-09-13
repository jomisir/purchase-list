import { describe, expect, it } from 'vitest'
import { createInitialData, initialState, plannerReducer, type PlannerState } from '@/context/plannerReducer'
import { computeTotals } from '@/lib/calc'
import { makeProduct } from '@/lib/testUtils'
import { parseImport, serializeExport } from '@/lib/transfer'
import type { ProductDraft } from '@/context/plannerReducer'

function hydrated(products = [makeProduct()]): PlannerState {
  return { ...createInitialData(), products, hydrated: true }
}

const draft: ProductDraft = {
  name: 'Anker 65W charger',
  category: 'Electronics',
  image: null,
  quantity: 1,
  targetPrice: 140,
  targetMin: null,
  targetMax: null,
  estimatedPrice: 150,
  currentPrice: null,
  actualPrice: null,
  notes: undefined,
  store: undefined,
  productUrl: undefined,
  brand: undefined,
  alternativeToId: null,
}

describe('hydrate', () => {
  it('plants the seed catalogue when storage is empty', () => {
    const state = plannerReducer(initialState, { type: 'hydrate', data: null })
    expect(state.hydrated).toBe(true)
    expect(state.products.length).toBeGreaterThan(20)
    expect(state.settings.budget).toBe(5500)
  })

  it('restores stored data as-is', () => {
    const stored = { ...createInitialData(), products: [makeProduct({ name: 'Kept' })] }
    const state = plannerReducer(initialState, { type: 'hydrate', data: stored })
    expect(state.products).toHaveLength(1)
    expect(state.products[0].name).toBe('Kept')
  })
})

describe('products', () => {
  it('adds a custom product by default', () => {
    const state = plannerReducer(hydrated([]), { type: 'addProduct', draft, id: 'new-1' })
    expect(state.products).toHaveLength(1)
    expect(state.products[0].isCustom).toBe(true)
    expect(state.products[0].priceHistory).toHaveLength(0)
  })

  it('logs a first price record when one is supplied on creation', () => {
    const state = plannerReducer(hydrated([]), {
      type: 'addProduct',
      draft: { ...draft, currentPrice: 129 },
      id: 'new-2',
    })
    expect(state.products[0].priceHistory).toHaveLength(1)
    expect(state.products[0].priceHistory[0].price).toBe(129)
  })

  it('edits a product and stamps lastUpdated', () => {
    const base = hydrated([makeProduct({ id: 'p1', name: 'Old', lastUpdated: '2000-01-01T00:00:00.000Z' })])
    const state = plannerReducer(base, {
      type: 'updateProduct',
      id: 'p1',
      patch: { name: 'New', estimatedPrice: 42 },
    })
    expect(state.products[0].name).toBe('New')
    expect(state.products[0].estimatedPrice).toBe(42)
    expect(state.products[0].lastUpdated > '2000-01-01T00:00:00.000Z').toBe(true)
  })

  it('cannot have its id overwritten by a patch', () => {
    const base = hydrated([makeProduct({ id: 'p1' })])
    const state = plannerReducer(base, {
      type: 'updateProduct',
      id: 'p1',
      patch: { id: 'hacked' } as never,
    })
    expect(state.products[0].id).toBe('p1')
  })

  it('deletes a product', () => {
    const base = hydrated([makeProduct({ id: 'p1' }), makeProduct({ id: 'p2' })])
    const state = plannerReducer(base, { type: 'deleteProduct', id: 'p1' })
    expect(state.products.map((product) => product.id)).toEqual(['p2'])
  })
})

describe('purchases', () => {
  it('records the paid price, the purchase date and a history entry', () => {
    const base = hydrated([makeProduct({ id: 'p1', estimatedPrice: 1550, targetPrice: 1550 })])
    const state = plannerReducer(base, { type: 'setPurchased', id: 'p1', purchased: true, actualPrice: 1480 })
    const product = state.products[0]
    expect(product.purchased).toBe(true)
    expect(product.actualPrice).toBe(1480)
    expect(product.purchasedAt).toBeTruthy()
    expect(product.priceHistory).toHaveLength(1)
    expect(product.priceHistory[0].source).toBe('purchase')
    expect(computeTotals(state.products, 5500).actualTotal).toBe(1480)
  })

  it('allows being marked bought without a price', () => {
    const base = hydrated([makeProduct({ id: 'p1' })])
    const state = plannerReducer(base, { type: 'setPurchased', id: 'p1', purchased: true, actualPrice: null })
    expect(state.products[0].purchased).toBe(true)
    expect(state.products[0].actualPrice).toBeNull()
    expect(state.products[0].priceHistory).toHaveLength(0)
  })

  it('clears the paid price when unchecked but keeps the product and its history', () => {
    const base = hydrated([makeProduct({ id: 'p1' })])
    const bought = plannerReducer(base, { type: 'setPurchased', id: 'p1', purchased: true, actualPrice: 99 })
    const undone = plannerReducer(bought, { type: 'setPurchased', id: 'p1', purchased: false })
    expect(undone.products).toHaveLength(1)
    expect(undone.products[0].purchased).toBe(false)
    expect(undone.products[0].actualPrice).toBeNull()
    expect(undone.products[0].priceHistory).toHaveLength(1)
  })
})

describe('price records', () => {
  it('sets the current price from the most recently dated record', () => {
    let state = hydrated([makeProduct({ id: 'p1' })])
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 249, date: '2026-09-10', store: 'Store A' },
    })
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 229, date: '2026-09-12', store: 'Store C' },
    })
    // An older sighting must not become the "current" price.
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 235, date: '2026-09-11', store: 'Store B' },
    })
    expect(state.products[0].currentPrice).toBe(229)
    expect(state.products[0].store).toBe('Store C')
    expect(state.products[0].priceHistory).toHaveLength(3)
  })

  it('recalculates the current price after a record is deleted', () => {
    let state = hydrated([makeProduct({ id: 'p1' })])
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 100, date: '2026-09-10' },
    })
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 80, date: '2026-09-12' },
    })
    const latestId = state.products[0].priceHistory[1].id
    state = plannerReducer(state, { type: 'deletePriceRecord', productId: 'p1', recordId: latestId })
    expect(state.products[0].currentPrice).toBe(100)

    const lastId = state.products[0].priceHistory[0].id
    state = plannerReducer(state, { type: 'deletePriceRecord', productId: 'p1', recordId: lastId })
    expect(state.products[0].currentPrice).toBeNull()
  })
})

describe('settings and data', () => {
  it('sets the budget and never lets it go negative', () => {
    expect(plannerReducer(hydrated(), { type: 'setBudget', budget: 7000 }).settings.budget).toBe(7000)
    expect(plannerReducer(hydrated(), { type: 'setBudget', budget: -10 }).settings.budget).toBe(0)
  })

  it('replaces everything on import', () => {
    const imported = { ...createInitialData(), products: [makeProduct({ name: 'Imported' })] }
    const state = plannerReducer(hydrated(), { type: 'replaceData', data: imported })
    expect(state.products).toHaveLength(1)
    expect(state.products[0].name).toBe('Imported')
  })

  it('resets to the seed plan but keeps the appearance choice', () => {
    const base: PlannerState = {
      ...hydrated([makeProduct()]),
      settings: { ...createInitialData().settings, budget: 9000, theme: 'dark' },
    }
    const state = plannerReducer(base, { type: 'resetToSeed' })
    expect(state.products.length).toBeGreaterThan(20)
    expect(state.settings.budget).toBe(5500)
    expect(state.settings.theme).toBe('dark')
  })
})

describe('changing the home currency', () => {
  const rates = {
    base: 'AED',
    values: { AED: 1, USD: 0.25 },
    updatedAt: '2026-09-13T00:00:00.000Z',
    source: 'api' as const,
    overrides: {},
  }

  function withRates(products = [makeProduct({ estimatedPrice: 100, currency: 'AED' })]) {
    const base = hydrated(products)
    return { ...base, settings: { ...base.settings, budget: 4000, rates } }
  }

  it('converts the budget and every product when asked', () => {
    const state = plannerReducer(withRates(), {
      type: 'setCurrency',
      currency: 'USD',
      convertAmounts: true,
    })
    expect(state.settings.currency).toBe('USD')
    expect(state.settings.budget).toBeCloseTo(1000, 6)
    expect(state.products[0].currency).toBe('USD')
    expect(state.products[0].estimatedPrice).toBeCloseTo(25, 6)
  })

  it('re-bases the stored rates so conversions keep working', () => {
    const state = plannerReducer(withRates(), {
      type: 'setCurrency',
      currency: 'USD',
      convertAmounts: true,
    })
    expect(state.settings.rates.base).toBe('USD')
    expect(state.settings.rates.values.USD).toBe(1)
    expect(state.settings.rates.values.AED).toBeCloseTo(4, 6)
  })

  it('leaves the numbers alone when only the label should change', () => {
    const state = plannerReducer(withRates(), {
      type: 'setCurrency',
      currency: 'USD',
      convertAmounts: false,
    })
    expect(state.settings.currency).toBe('USD')
    expect(state.settings.budget).toBe(4000)
    expect(state.products[0].estimatedPrice).toBe(100)
    expect(state.products[0].currency).toBe('AED')
  })

  it('converts price history alongside the product', () => {
    const product = makeProduct({
      estimatedPrice: 100,
      currency: 'AED',
      priceHistory: [
        { id: 'r1', productId: 'p', price: 80, currency: 'AED', date: '2026-09-10', source: 'manual' },
      ],
    })
    const state = plannerReducer(withRates([product]), {
      type: 'setCurrency',
      currency: 'USD',
      convertAmounts: true,
    })
    expect(state.products[0].priceHistory[0].price).toBeCloseTo(20, 6)
    expect(state.products[0].priceHistory[0].currency).toBe('USD')
  })

  it('is a no-op when the currency is unchanged', () => {
    const before = withRates()
    expect(plannerReducer(before, { type: 'setCurrency', currency: 'AED', convertAmounts: true })).toBe(
      before,
    )
  })
})

describe('manual exchange rates', () => {
  it('stores an override and marks the rates as edited', () => {
    const state = plannerReducer(hydrated(), { type: 'setRateOverride', code: 'usd', rate: 0.3 })
    expect(state.settings.rates.values.USD).toBe(0.3)
    expect(state.settings.rates.overrides?.USD).toBe(0.3)
    expect(state.settings.rates.source).toBe('manual')
  })

  it('removes an override when cleared or given nonsense', () => {
    let state = plannerReducer(hydrated(), { type: 'setRateOverride', code: 'USD', rate: 0.3 })
    state = plannerReducer(state, { type: 'setRateOverride', code: 'USD', rate: null })
    expect(state.settings.rates.overrides?.USD).toBeUndefined()
    state = plannerReducer(state, { type: 'setRateOverride', code: 'EUR', rate: -1 })
    expect(state.settings.rates.overrides?.EUR).toBeUndefined()
  })
})

describe('logging a price in another currency', () => {
  const rates = {
    base: 'AED',
    values: { AED: 1, USD: 0.25 },
    updatedAt: '2026-09-13T00:00:00.000Z',
    source: 'api' as const,
    overrides: {},
  }

  function withRates(product: ReturnType<typeof makeProduct>) {
    const base = hydrated([product])
    return { ...base, settings: { ...base.settings, rates } }
  }

  it('converts the sighting into the product’s own currency', () => {
    // $60 at 4 AED to the dollar is AED 240 — not "AED 60".
    const state = plannerReducer(
      withRates(makeProduct({ id: 'p1', currency: 'AED', estimatedPrice: 230 })),
      { type: 'addPriceRecord', productId: 'p1', draft: { price: 60, currency: 'USD', date: '2026-09-12' } },
    )
    expect(state.products[0].currentPrice).toBeCloseTo(240, 6)
    // The record itself keeps the currency it was actually seen in.
    expect(state.products[0].priceHistory[0].currency).toBe('USD')
    expect(state.products[0].priceHistory[0].price).toBe(60)
  })

  it('leaves the current price alone when no rate can convert the sighting', () => {
    let state = plannerReducer(
      withRates(makeProduct({ id: 'p1', currency: 'AED', currentPrice: 200 })),
      { type: 'addPriceRecord', productId: 'p1', draft: { price: 5000, currency: 'JPY', date: '2026-09-12' } },
    )
    // No AED/JPY rate exists, so 5000 must not be adopted as an AED price.
    expect(state.products[0].currentPrice).toBe(200)
    expect(state.products[0].priceHistory).toHaveLength(1)

    // Once a rate exists the next sighting converts normally.
    state = plannerReducer(state, { type: 'setRateOverride', code: 'JPY', rate: 40 })
    state = plannerReducer(state, {
      type: 'addPriceRecord',
      productId: 'p1',
      draft: { price: 4000, currency: 'JPY', date: '2026-09-13' },
    })
    expect(state.products[0].currentPrice).toBeCloseTo(100, 6)
  })

  it('defaults a sighting to the product’s currency when none is given', () => {
    const state = plannerReducer(
      withRates(makeProduct({ id: 'p1', currency: 'USD' })),
      { type: 'addPriceRecord', productId: 'p1', draft: { price: 42, date: '2026-09-12' } },
    )
    expect(state.products[0].priceHistory[0].currency).toBe('USD')
    expect(state.products[0].currentPrice).toBe(42)
  })
})

describe('the warning threshold setting', () => {
  it('stores a new threshold', () => {
    const state = plannerReducer(hydrated(), { type: 'setAlertThreshold', threshold: 0.6 })
    expect(state.settings.alertThreshold).toBe(0.6)
  })

  it('refuses to store one outside the usable band', () => {
    expect(
      plannerReducer(hydrated(), { type: 'setAlertThreshold', threshold: 2 }).settings.alertThreshold,
    ).toBe(1)
    expect(
      plannerReducer(hydrated(), { type: 'setAlertThreshold', threshold: 0 }).settings.alertThreshold,
    ).toBe(0.5)
  })

  it('survives an export and import round trip', () => {
    const state = plannerReducer(hydrated(), { type: 'setAlertThreshold', threshold: 0.65 })
    const { hydrated: _drop, ...data } = state
    const restored = parseImport(serializeExport(data))
    expect(restored.data.settings.alertThreshold).toBe(0.65)
  })
})
