import { describe, expect, it } from 'vitest'
import { createSeedProducts, DEFAULT_BUDGET, SEED_PRODUCTS } from '@/data/seed'
import { BUILTIN_IMAGES } from '@/assets/products'
import { computeTotals, lineEstimate } from '@/lib/calc'
import { CATEGORIES } from '@/types'

const products = createSeedProducts()

describe('preloaded catalogue', () => {
  it('is not empty and every product has a name, price and quantity', () => {
    expect(products.length).toBe(25)
    for (const product of products) {
      expect(product.name.trim()).not.toBe('')
      expect(product.estimatedPrice).toBeGreaterThan(0)
      expect(product.quantity).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(product.quantity)).toBe(true)
      expect(CATEGORIES).toContain(product.category)
    }
  })

  it('has no duplicate ids or names', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length)
    expect(new Set(products.map((p) => p.name.toLowerCase())).size).toBe(products.length)
  })

  it('plans exactly one smartwatch', () => {
    const watches = products.filter((product) => /smartwatch/i.test(product.name))
    expect(watches).toHaveLength(1)
  })

  it('gives every product a bundled illustration that actually exists', () => {
    for (const product of products) {
      expect(product.image).not.toBeNull()
      if (product.image?.kind === 'builtin') {
        expect(BUILTIN_IMAGES[product.image.key]).toBeDefined()
      }
    }
  })

  it('starts with no observed prices, no purchases and no history', () => {
    for (const product of products) {
      expect(product.currentPrice).toBeNull()
      expect(product.actualPrice).toBeNull()
      expect(product.purchased).toBe(false)
      expect(product.priceHistory).toEqual([])
      expect(product.isCustom).toBe(false)
    }
  })

  it('keeps every target price inside its stated range', () => {
    for (const seed of SEED_PRODUCTS) {
      if (seed.targetMin != null) expect(seed.targetPrice).toBeGreaterThanOrEqual(seed.targetMin)
      if (seed.targetMax != null) expect(seed.targetPrice).toBeLessThanOrEqual(seed.targetMax)
    }
  })

  it('derives the estimated total from the products themselves', () => {
    const totals = computeTotals(products, DEFAULT_BUDGET)
    const byHand = products.reduce((sum, product) => sum + lineEstimate(product), 0)
    expect(totals.estimatedTotal).toBe(byHand)
    expect(totals.estimatedTotal).toBe(6229)
    expect(totals.actualTotal).toBe(0)
    expect(totals.remaining).toBe(DEFAULT_BUDGET)
    expect(totals.completion).toBe(0)
  })

  it('matches the brief on the multi-quantity line totals', () => {
    const byId = new Map(products.map((product) => [product.id, product]))
    expect(lineEstimate(byId.get('seed-shoes')!)).toBe(450)
    expect(lineEstimate(byId.get('seed-school-backpack')!)).toBe(135)
    expect(lineEstimate(byId.get('seed-belts')!)).toBe(90)
    expect(lineEstimate(byId.get('seed-skateboard')!)).toBe(450)
    expect(lineEstimate(byId.get('seed-water-bottles')!)).toBe(90)
    expect(lineEstimate(byId.get('seed-clothing-haul')!)).toBe(735)
  })
})
