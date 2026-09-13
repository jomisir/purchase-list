import type { Product, ShoppingListMeta } from '@/types'
import { createId } from '@/lib/id'
import { nowIso } from '@/lib/date'
import { DEFAULT_BUDGET } from '@/data/seed'

export const DEFAULT_LIST_NAME = 'My list'
export const MAX_LISTS = 12

export function createList(name: string, budget: number = DEFAULT_BUDGET): ShoppingListMeta {
  return {
    id: createId('list'),
    name: name.trim() || DEFAULT_LIST_NAME,
    budget: Number.isFinite(budget) && budget >= 0 ? budget : DEFAULT_BUDGET,
    createdAt: nowIso(),
  }
}

/**
 * Brings any stored shape up to the current one.
 *
 * Data saved before lists existed has no `lists`, no `activeListId` and no
 * `listId` on its products. That data is already on people's phones, so the
 * rule here is that nothing is ever dropped: everything it finds is adopted
 * into a single list rather than discarded for not matching the new shape.
 */
export function migrateToLists(
  data: {
    products: Product[]
    /**
     * Whatever was stored under `settings`. Deliberately untyped: this runs
     * against data written by older versions of the app, so it reads
     * defensively rather than trusting a shape.
     */
    settings?: unknown
    lists?: unknown
    activeListId?: unknown
  },
): { lists: ShoppingListMeta[]; activeListId: string; products: Product[] } {
  const rawLists = Array.isArray(data.lists) ? data.lists : []
  const lists: ShoppingListMeta[] = rawLists
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const record = entry as Record<string, unknown>
      const id = typeof record.id === 'string' && record.id ? record.id : createId('list')
      const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : DEFAULT_LIST_NAME
      const budget = typeof record.budget === 'number' && Number.isFinite(record.budget) && record.budget >= 0
        ? record.budget
        : DEFAULT_BUDGET
      const createdAt = typeof record.createdAt === 'string' ? record.createdAt : nowIso()
      return { id, name, budget, createdAt }
    })
    .filter((entry): entry is ShoppingListMeta => entry !== null)

  // Pre-lists data: adopt the old global budget as the one list's budget.
  if (lists.length === 0) {
    const settings = data.settings
    const stored =
      typeof settings === 'object' && settings !== null
        ? (settings as Record<string, unknown>).budget
        : undefined
    const legacyBudget =
      typeof stored === 'number' && Number.isFinite(stored) && stored >= 0
        ? stored
        : DEFAULT_BUDGET
    lists.push(createList(DEFAULT_LIST_NAME, legacyBudget))
  }

  const ids = new Set(lists.map((list) => list.id))
  const fallback = lists[0].id

  // Any product without a home — old data, or one whose list was removed —
  // lands in the first list rather than becoming invisible.
  const products = data.products.map((product) =>
    typeof product.listId === 'string' && ids.has(product.listId)
      ? product
      : { ...product, listId: fallback },
  )

  const activeListId =
    typeof data.activeListId === 'string' && ids.has(data.activeListId)
      ? data.activeListId
      : fallback

  return { lists, activeListId, products }
}

export function productsOfList(products: Product[], listId: string): Product[] {
  return products.filter((product) => product.listId === listId)
}

export function listById(
  lists: ShoppingListMeta[],
  id: string,
): ShoppingListMeta | undefined {
  return lists.find((list) => list.id === id)
}
