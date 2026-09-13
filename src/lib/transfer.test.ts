import { describe, expect, it } from 'vitest'
import { ImportError, normalizeProduct, parseImport, serializeExport } from '@/lib/transfer'
import { createInitialData } from '@/context/plannerReducer'
import { makeProduct, makeRecord } from '@/lib/testUtils'

describe('export / import round trip', () => {
  it('restores products, purchases, prices, history and budget', () => {
    const data = {
      ...createInitialData(),
      settings: { ...createInitialData().settings, budget: 6000, theme: 'dark' as const },
      products: [
        makeProduct({
          name: 'Used iPhone 14 Pro',
          purchased: true,
          actualPrice: 1480,
          currentPrice: 1500,
          isCustom: true,
          priceHistory: [makeRecord({ price: 1500, store: 'Store A' })],
        }),
      ],
    }

    const result = parseImport(serializeExport(data))
    expect(result.productCount).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.data.settings.budget).toBe(6000)
    expect(result.data.settings.theme).toBe('dark')

    const product = result.data.products[0]
    expect(product.name).toBe('Used iPhone 14 Pro')
    expect(product.purchased).toBe(true)
    expect(product.actualPrice).toBe(1480)
    expect(product.isCustom).toBe(true)
    expect(product.priceHistory[0].store).toBe('Store A')
  })

  it('accepts a bare AppData object as well as a wrapped export', () => {
    const data = createInitialData()
    const result = parseImport(JSON.stringify(data))
    expect(result.productCount).toBe(data.products.length)
  })
})

describe('import errors', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseImport('not json at all')).toThrow(ImportError)
    expect(() => parseImport('not json at all')).toThrow(/not valid JSON/i)
  })

  it('rejects JSON with no product list', () => {
    expect(() => parseImport('{"hello":"world"}')).toThrow(/No product list/i)
  })

  it('rejects an array at the top level', () => {
    expect(() => parseImport('[1,2,3]')).toThrow(/does not contain shopping planner data/i)
  })

  it('rejects a backup whose products are all unusable', () => {
    expect(() => parseImport('{"products":[{"price":5},{"name":""}]}')).toThrow(/at least a name/i)
  })

  it('rejects an empty product list', () => {
    expect(() => parseImport('{"products":[]}')).toThrow(/no products/i)
  })

  it('keeps the readable products and counts the rest as skipped', () => {
    const result = parseImport('{"products":[{"name":"Good","estimatedPrice":10},{"nope":true}]}')
    expect(result.productCount).toBe(1)
    expect(result.skipped).toBe(1)
  })
})

describe('normalizeProduct', () => {
  it('repairs missing, negative and malformed fields', () => {
    const product = normalizeProduct({
      name: '  Sunglasses  ',
      estimatedPrice: '55',
      quantity: 0,
      category: 'NotARealCategory',
      currentPrice: -10,
      targetPrice: 'abc',
    })
    expect(product).not.toBeNull()
    expect(product?.name).toBe('Sunglasses')
    expect(product?.estimatedPrice).toBe(55)
    expect(product?.quantity).toBe(1)
    expect(product?.category).toBe('Other')
    expect(product?.currentPrice).toBeNull()
    expect(product?.targetPrice).toBeNull()
    expect(product?.id).toBeTruthy()
  })

  it('drops anything without a name', () => {
    expect(normalizeProduct({ estimatedPrice: 10 })).toBeNull()
    expect(normalizeProduct('nope')).toBeNull()
    expect(normalizeProduct(null)).toBeNull()
  })

  it('keeps builtin image keys and rejects non-image data URLs', () => {
    expect(normalizeProduct({ name: 'A', image: { kind: 'builtin', key: 'shoes' } })?.image).toEqual({
      kind: 'builtin',
      key: 'shoes',
    })
    expect(
      normalizeProduct({ name: 'A', image: { kind: 'data', dataUrl: 'javascript:alert(1)' } })?.image,
    ).toBeNull()
    expect(
      normalizeProduct({ name: 'A', image: { kind: 'data', dataUrl: 'data:image/png;base64,AAA' } })
        ?.image,
    ).toEqual({ kind: 'data', dataUrl: 'data:image/png;base64,AAA', name: undefined })
  })

  it('discards price records that have no usable price', () => {
    const product = normalizeProduct({
      name: 'A',
      priceHistory: [{ price: 10, date: '2026-09-01' }, { price: 'nope' }, { store: 'X' }],
    })
    expect(product?.priceHistory).toHaveLength(1)
    expect(product?.priceHistory[0].date).toBe('2026-09-01')
  })
})
