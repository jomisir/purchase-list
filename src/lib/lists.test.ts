import { describe, expect, it } from 'vitest'
import { createList, DEFAULT_LIST_NAME, MAX_LISTS, migrateToLists, productsOfList } from '@/lib/lists'
import { parseImport, serializeExport } from '@/lib/transfer'
import {
  activeBudget,
  activeProducts,
  createInitialData,
  plannerReducer,
  type PlannerState,
  type ProductDraft,
} from '@/context/plannerReducer'
import { makeProduct } from '@/lib/testUtils'
import { DEFAULT_BUDGET } from '@/data/seed'

function productDraft(name: string): ProductDraft {
  return {
    name,
    category: 'Electronics',
    image: null,
    quantity: 1,
    targetPrice: 100,
    targetMin: null,
    targetMax: null,
    estimatedPrice: 100,
    currentPrice: null,
    actualPrice: null,
    alternativeToId: null,
  }
}

describe('migrating data saved before lists existed', () => {
  it('adopts every product into one list rather than dropping any', () => {
    const legacy = {
      products: [makeProduct({ name: 'A' }), makeProduct({ name: 'B' })].map((p) => {
        const { listId: _drop, ...rest } = p
        return rest as never
      }),
      settings: { budget: 4200 },
    }
    const result = migrateToLists(legacy)
    expect(result.lists).toHaveLength(1)
    expect(result.lists[0].name).toBe(DEFAULT_LIST_NAME)
    expect(result.products).toHaveLength(2)
    expect(result.products.every((p) => p.listId === result.lists[0].id)).toBe(true)
    expect(result.activeListId).toBe(result.lists[0].id)
  })

  it('carries the old global budget onto the list it creates', () => {
    const result = migrateToLists({ products: [], settings: { budget: 4200 } })
    expect(result.lists[0].budget).toBe(4200)
  })

  it('falls back to the default budget when the old one is unusable', () => {
    expect(migrateToLists({ products: [], settings: { budget: -5 } }).lists[0].budget).toBe(DEFAULT_BUDGET)
    expect(migrateToLists({ products: [], settings: {} }).lists[0].budget).toBe(DEFAULT_BUDGET)
    expect(migrateToLists({ products: [] }).lists[0].budget).toBe(DEFAULT_BUDGET)
  })

  it('rehomes a product whose list no longer exists', () => {
    const keep = createList('Keep', 100)
    const result = migrateToLists({
      products: [makeProduct({ listId: 'gone-list' }), makeProduct({ listId: keep.id })],
      settings: {},
      lists: [keep],
      activeListId: keep.id,
    })
    // Nothing becomes invisible just because its list was removed.
    expect(productsOfList(result.products, keep.id)).toHaveLength(2)
  })

  it('repairs an active list id that points nowhere', () => {
    const keep = createList('Keep', 100)
    const result = migrateToLists({
      products: [],
      settings: {},
      lists: [keep],
      activeListId: 'nonsense',
    })
    expect(result.activeListId).toBe(keep.id)
  })

  it('discards malformed list entries but still leaves a usable list', () => {
    const result = migrateToLists({
      products: [makeProduct()],
      settings: {},
      lists: [null, 'nope', { name: '' }],
      activeListId: null,
    })
    expect(result.lists.length).toBeGreaterThanOrEqual(1)
    expect(result.products[0].listId).toBe(result.lists[0].id)
  })

  it('leaves already-migrated data untouched', () => {
    const a = createList('Mine', 1000)
    const b = createList('For my sister', 500)
    const result = migrateToLists({
      products: [makeProduct({ listId: b.id })],
      settings: {},
      lists: [a, b],
      activeListId: b.id,
    })
    expect(result.lists.map((l) => l.id)).toEqual([a.id, b.id])
    expect(result.activeListId).toBe(b.id)
    expect(result.products[0].listId).toBe(b.id)
  })
})

describe('importing a backup written before lists existed', () => {
  it('restores its products and its budget into a single list', () => {
    // Exactly the shape the app used to export.
    const legacy = {
      app: 'dubai-shopping-planner',
      version: 1,
      data: {
        version: 1,
        seedVersion: 1,
        settings: { budget: 5500, currency: 'AED', theme: 'dark' },
        products: [
          { id: 'p1', name: 'Old iPhone', estimatedPrice: 1550, quantity: 1, purchased: true, actualPrice: 1480 },
          { id: 'p2', name: 'Old belt', estimatedPrice: 45, quantity: 2 },
        ],
      },
    }
    const result = parseImport(JSON.stringify(legacy))
    expect(result.productCount).toBe(2)
    expect(result.data.lists).toHaveLength(1)
    expect(result.data.lists[0].budget).toBe(5500)
    expect(result.data.products.every((p) => p.listId === result.data.lists[0].id)).toBe(true)
    expect(result.data.settings.theme).toBe('dark')
    // The purchase survives the migration intact.
    expect(result.data.products[0].actualPrice).toBe(1480)
  })

  it('round-trips the new multi-list shape', () => {
    let state: PlannerState = { ...createInitialData(), hydrated: true }
    state = plannerReducer(state, {
      type: 'createList',
      name: 'For my sister',
      budget: 800,
      copyStarter: false,
    })
    const { hydrated: _drop, ...data } = state
    const restored = parseImport(serializeExport(data))
    expect(restored.data.lists).toHaveLength(2)
    expect(restored.data.lists[1].name).toBe('For my sister')
    expect(restored.data.lists[1].budget).toBe(800)
    expect(restored.data.activeListId).toBe(state.activeListId)
  })
})

/** A hydrated planner with one empty list, ready for the list actions. */
function blank(): PlannerState {
  return { ...createInitialData(), products: [], hydrated: true }
}

describe('keeping several lists', () => {
  it('creates a second list, opens it, and leaves the first one alone', () => {
    const first = blank()
    const firstId = first.activeListId
    const state = plannerReducer(first, {
      type: 'createList',
      name: 'Gifts for Mum',
      budget: 900,
      copyStarter: false,
    })
    expect(state.lists).toHaveLength(2)
    expect(state.lists[1].name).toBe('Gifts for Mum')
    expect(state.lists[1].budget).toBe(900)
    // The new list is the one you land on, and it starts empty.
    expect(state.activeListId).toBe(state.lists[1].id)
    expect(productsOfList(state.products, state.lists[1].id)).toHaveLength(0)
    expect(state.lists[0].id).toBe(firstId)
    expect(state.lists[0].budget).toBe(DEFAULT_BUDGET)
  })

  it('can start a new list from a copy of the starter plan, under its own ids', () => {
    const state = plannerReducer(blank(), {
      type: 'createList',
      name: 'For my sister',
      budget: 800,
      copyStarter: true,
    })
    const copied = productsOfList(state.products, state.activeListId)
    expect(copied.length).toBeGreaterThan(20)
    // Copies must not collide with the originals, or editing one would edit both.
    expect(new Set(state.products.map((p) => p.id)).size).toBe(state.products.length)
  })

  it('gives each list its own budget', () => {
    let state = plannerReducer(blank(), {
      type: 'createList',
      name: 'Gifts',
      budget: 900,
      copyStarter: false,
    })
    state = plannerReducer(state, { type: 'setBudget', budget: 1200 })
    expect(activeBudget(state)).toBe(1200)
    // Switching back shows the first list's own number, untouched.
    state = plannerReducer(state, { type: 'setActiveList', listId: state.lists[0].id })
    expect(activeBudget(state)).toBe(DEFAULT_BUDGET)
  })

  it('shows only the open list’s products', () => {
    let state = blank()
    const own = state.activeListId
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Charger'), id: 'p1' })
    state = plannerReducer(state, {
      type: 'createList',
      name: 'Gifts',
      budget: 500,
      copyStarter: false,
    })
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Scarf'), id: 'p2' })

    expect(activeProducts(state).map((p) => p.name)).toEqual(['Scarf'])
    state = plannerReducer(state, { type: 'setActiveList', listId: own })
    expect(activeProducts(state).map((p) => p.name)).toEqual(['Charger'])
    // Both are still stored — only the view narrowed.
    expect(state.products).toHaveLength(2)
  })

  it('moves a product between lists, history and all', () => {
    let state = blank()
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Scarf'), id: 'p1' })
    state = plannerReducer(state, {
      type: 'createList',
      name: 'Gifts',
      budget: 500,
      copyStarter: false,
    })
    const gifts = state.activeListId
    state = plannerReducer(state, { type: 'moveProduct', productId: 'p1', listId: gifts })
    expect(activeProducts(state).map((p) => p.id)).toEqual(['p1'])
    expect(state.products).toHaveLength(1)
  })

  it('ignores a move to a list that does not exist', () => {
    let state = blank()
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Scarf'), id: 'p1' })
    const before = state.products[0].listId
    state = plannerReducer(state, { type: 'moveProduct', productId: 'p1', listId: 'nope' })
    expect(state.products[0].listId).toBe(before)
  })

  it('renames a list, and refuses a blank name', () => {
    let state = blank()
    const id = state.activeListId
    state = plannerReducer(state, { type: 'renameList', listId: id, name: '  Gifts  ' })
    expect(state.lists[0].name).toBe('Gifts')
    state = plannerReducer(state, { type: 'renameList', listId: id, name: '   ' })
    expect(state.lists[0].name).toBe('Gifts')
  })

  it('deletes a list with its products and opens another', () => {
    let state = blank()
    const own = state.activeListId
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Charger'), id: 'p1' })
    state = plannerReducer(state, {
      type: 'createList',
      name: 'Gifts',
      budget: 500,
      copyStarter: false,
    })
    const gifts = state.activeListId
    state = plannerReducer(state, { type: 'addProduct', draft: productDraft('Scarf'), id: 'p2' })

    state = plannerReducer(state, { type: 'deleteList', listId: gifts })
    expect(state.lists).toHaveLength(1)
    expect(state.activeListId).toBe(own)
    // The deleted list's products go with it; the other list's do not.
    expect(state.products.map((p) => p.id)).toEqual(['p1'])
  })

  it('refuses to delete the last list, so there is always somewhere to put a product', () => {
    const state = blank()
    const after = plannerReducer(state, { type: 'deleteList', listId: state.activeListId })
    expect(after).toBe(state)
  })

  it('stops at the maximum number of lists', () => {
    let state = blank()
    for (let index = 0; index < MAX_LISTS + 3; index += 1) {
      state = plannerReducer(state, {
        type: 'createList',
        name: `List ${index}`,
        budget: 100,
        copyStarter: false,
      })
    }
    expect(state.lists).toHaveLength(MAX_LISTS)
  })

  it('converts every list’s budget when the home currency changes', () => {
    let state = blank()
    state = plannerReducer(state, {
      type: 'createList',
      name: 'Gifts',
      budget: 1000,
      copyStarter: false,
    })
    state = plannerReducer(state, {
      type: 'setRates',
      rates: {
        base: 'AED',
        values: { AED: 1, USD: 0.25 },
        updatedAt: '2026-09-13T00:00:00.000Z',
        source: 'manual',
      },
    })
    state = plannerReducer(state, { type: 'setCurrency', currency: 'USD', convertAmounts: true })
    expect(state.lists.map((list) => list.budget)).toEqual([DEFAULT_BUDGET * 0.25, 250])
  })
})
