import { describe, expect, it } from 'vitest'
import {
  ImportError,
  mergeAppData,
  normalizeProduct,
  parseImport,
  serializeExport,
} from '@/lib/transfer'
import { createInitialData } from '@/context/plannerReducer'
import { makeProduct, makeRecord } from '@/lib/testUtils'

describe('export / import round trip', () => {
  it('restores products, purchases, prices, history and budget', () => {
    const data = {
      ...createInitialData(),
      settings: { ...createInitialData().settings, theme: 'dark' as const },
      lists: createInitialData().lists.map((list) => ({ ...list, budget: 6000 })),
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
    expect(result.data.lists[0].budget).toBe(6000)
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


describe('adding an imported file alongside what is already here', () => {
  /** A tiny second file: one list, two products. */
  function incoming(name = 'Dad') {
    const base = createInitialData()
    const list = { ...base.lists[0], id: 'list-incoming', name, budget: 0 }
    return {
      ...base,
      lists: [list],
      activeListId: list.id,
      products: [
        makeProduct({ id: 'p-a', listId: list.id, name: 'Warm tracksuits', quantity: 2 }),
        makeProduct({ id: 'p-b', listId: list.id, name: "Men's watch" }),
      ],
    }
  }

  it('keeps the existing lists and adds the new one beside them', () => {
    const current = createInitialData()
    const before = current.products.length
    const result = mergeAppData(current, incoming())

    expect(result.addedLists).toBe(1)
    expect(result.addedProducts).toBe(2)
    expect(result.data.lists).toHaveLength(2)
    expect(result.data.lists[0].id).toBe(current.lists[0].id)
    expect(result.data.lists[1].name).toBe('Dad')
    expect(result.data.products).toHaveLength(before + 2)
  })

  it('opens the list that was just imported', () => {
    const result = mergeAppData(createInitialData(), incoming())
    expect(result.data.activeListId).toBe(result.data.lists[1].id)
  })

  it('rehomes the imported products onto their new list', () => {
    const result = mergeAppData(createInitialData(), incoming())
    const added = result.data.products.filter((p) => p.listId === result.data.lists[1].id)
    expect(added.map((p) => p.name).sort()).toEqual(["Men's watch", 'Warm tracksuits'])
    expect(added.find((p) => p.name === 'Warm tracksuits')?.quantity).toBe(2)
  })

  it('keeps the device’s own currency and appearance, not the file’s', () => {
    const current = {
      ...createInitialData(),
      settings: { ...createInitialData().settings, currency: 'EUR', theme: 'dark' as const },
    }
    const file = {
      ...incoming(),
      settings: { ...createInitialData().settings, currency: 'JPY', theme: 'light' as const },
    }
    const result = mergeAppData(current, file)
    expect(result.data.settings.currency).toBe('EUR')
    expect(result.data.settings.theme).toBe('dark')
  })

  it('numbers a name that is already taken instead of showing two identical tabs', () => {
    const first = mergeAppData(createInitialData(), incoming())
    const second = mergeAppData(first.data, incoming())
    expect(second.data.lists.map((list) => list.name)).toEqual(['My list', 'Dad', 'Dad (2)'])
  })

  it('importing the same file twice makes a second copy rather than overwriting the first', () => {
    const first = mergeAppData(createInitialData(), incoming())
    const second = mergeAppData(first.data, incoming())
    const ids = second.data.products.map((product) => product.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(second.data.products.filter((p) => p.name === 'Warm tracksuits')).toHaveLength(2)
  })

  it('keeps price history attached to the product it was copied onto', () => {
    const file = incoming()
    file.products[0] = makeProduct({
      id: 'p-a',
      listId: file.lists[0].id,
      name: 'Sneakers',
      priceHistory: [makeRecord({ productId: 'p-a', price: 220 })],
    })
    const current = { ...createInitialData(), products: [makeProduct({ id: 'p-a' })] }
    const result = mergeAppData(current, file)
    const moved = result.data.products.find((p) => p.name === 'Sneakers')
    expect(moved).toBeDefined()
    // Its id had to change to avoid the collision, and its history followed.
    expect(moved?.id).not.toBe('p-a')
    expect(moved?.priceHistory[0].productId).toBe(moved?.id)
  })

  it('refuses rather than silently dropping lists when it would pass the limit', () => {
    let data = createInitialData()
    for (let index = 0; index < 11; index += 1) {
      data = mergeAppData(data, incoming(`List ${index}`)).data
    }
    expect(data.lists).toHaveLength(12)
    expect(() => mergeAppData(data, incoming('One too many'))).toThrow(ImportError)
  })
})
