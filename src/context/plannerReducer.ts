import type { AppData, PriceRecord, Product, Settings, ThemePreference } from '@/types'
import { createId } from '@/lib/id'
import { isoDate, nowIso } from '@/lib/date'
import { compareRecordDate } from '@/lib/calc'
import { createSeedProducts, DEFAULT_BUDGET, DEFAULT_CURRENCY, SEED_VERSION } from '@/data/seed'
import { DATA_VERSION } from '@/lib/transfer'

export interface PlannerState extends AppData {
  /** False until storage has been read, so the UI can avoid a flash of seed data. */
  hydrated: boolean
}

export type ProductDraft = Omit<
  Product,
  | 'id'
  | 'dateAdded'
  | 'lastUpdated'
  | 'priceHistory'
  | 'currency'
  | 'purchased'
  | 'purchasedAt'
  | 'isCustom'
> &
  Partial<Pick<Product, 'purchased' | 'purchasedAt' | 'isCustom'>>

export type PriceRecordDraft = Omit<PriceRecord, 'id' | 'productId' | 'currency' | 'source'> &
  Partial<Pick<PriceRecord, 'source'>>

export type PlannerAction =
  | { type: 'hydrate'; data: AppData | null }
  | { type: 'setBudget'; budget: number }
  | { type: 'setTheme'; theme: ThemePreference }
  | { type: 'addProduct'; draft: ProductDraft; id?: string }
  | { type: 'updateProduct'; id: string; patch: Partial<Product> }
  | { type: 'deleteProduct'; id: string }
  | { type: 'setPurchased'; id: string; purchased: boolean; actualPrice?: number | null }
  | { type: 'addPriceRecord'; productId: string; draft: PriceRecordDraft }
  | { type: 'deletePriceRecord'; productId: string; recordId: string }
  | { type: 'replaceData'; data: AppData }
  | { type: 'resetToSeed' }

export function defaultSettings(): Settings {
  return { budget: DEFAULT_BUDGET, currency: DEFAULT_CURRENCY, theme: 'system' }
}

export function createInitialData(): AppData {
  return {
    version: DATA_VERSION,
    products: createSeedProducts(),
    settings: defaultSettings(),
    seedVersion: SEED_VERSION,
  }
}

export const initialState: PlannerState = {
  ...createInitialData(),
  products: [],
  hydrated: false,
}

/**
 * Recomputes the fields that are derived from a product's price history:
 * the current price is always the most recently dated observation.
 */
function withDerivedPrices(product: Product): Product {
  if (product.priceHistory.length === 0) return product
  const sorted = [...product.priceHistory].sort(compareRecordDate)
  const latest = sorted[sorted.length - 1]
  return {
    ...product,
    priceHistory: sorted,
    currentPrice: latest.price,
    store: latest.store ?? product.store,
  }
}

function touch(product: Product): Product {
  return { ...product, lastUpdated: nowIso() }
}

function mapProduct(
  state: PlannerState,
  id: string,
  update: (product: Product) => Product,
): PlannerState {
  let changed = false
  const products = state.products.map((product) => {
    if (product.id !== id) return product
    changed = true
    return touch(update(product))
  })
  return changed ? { ...state, products } : state
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'hydrate': {
      const data = action.data ?? createInitialData()
      return { ...data, hydrated: true }
    }

    case 'setBudget':
      return {
        ...state,
        settings: { ...state.settings, budget: Math.max(0, action.budget) },
      }

    case 'setTheme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }

    case 'addProduct': {
      const timestamp = nowIso()
      const product: Product = {
        ...action.draft,
        id: action.id ?? createId('product'),
        currency: DEFAULT_CURRENCY,
        purchased: action.draft.purchased ?? false,
        purchasedAt: action.draft.purchasedAt ?? null,
        isCustom: action.draft.isCustom ?? true,
        dateAdded: timestamp,
        lastUpdated: timestamp,
        priceHistory: [],
      }
      // A price seen at the moment of adding is a real observation — record it.
      if (product.currentPrice != null) {
        product.priceHistory = [
          {
            id: createId('price'),
            productId: product.id,
            price: product.currentPrice,
            currency: DEFAULT_CURRENCY,
            store: product.store,
            date: isoDate(),
            url: product.productUrl,
            source: 'manual',
          },
        ]
      }
      return { ...state, products: [...state.products, product] }
    }

    case 'updateProduct':
      return mapProduct(state, action.id, (product) =>
        withDerivedPrices({ ...product, ...action.patch, id: product.id }),
      )

    case 'deleteProduct':
      return {
        ...state,
        products: state.products.filter((product) => product.id !== action.id),
      }

    case 'setPurchased':
      return mapProduct(state, action.id, (product) => {
        if (!action.purchased) {
          return { ...product, purchased: false, actualPrice: null, purchasedAt: null }
        }
        const actualPrice = action.actualPrice ?? product.actualPrice ?? product.currentPrice
        const next: Product = {
          ...product,
          purchased: true,
          actualPrice: actualPrice ?? null,
          purchasedAt: nowIso(),
        }
        // Log what was paid so it shows up in price history and store comparison.
        if (actualPrice != null && actualPrice !== product.actualPrice) {
          next.priceHistory = [
            ...product.priceHistory,
            {
              id: createId('price'),
              productId: product.id,
              price: actualPrice,
              currency: DEFAULT_CURRENCY,
              store: product.store,
              date: isoDate(),
              notes: 'Price paid',
              source: 'purchase',
            },
          ]
          next.currentPrice = actualPrice
        }
        return next
      })

    case 'addPriceRecord':
      return mapProduct(state, action.productId, (product) =>
        withDerivedPrices({
          ...product,
          priceHistory: [
            ...product.priceHistory,
            {
              ...action.draft,
              id: createId('price'),
              productId: product.id,
              currency: DEFAULT_CURRENCY,
              source: action.draft.source ?? 'manual',
            },
          ],
        }),
      )

    case 'deletePriceRecord':
      return mapProduct(state, action.productId, (product) => {
        const priceHistory = product.priceHistory.filter(
          (record) => record.id !== action.recordId,
        )
        if (priceHistory.length === 0) {
          return { ...product, priceHistory, currentPrice: null }
        }
        return withDerivedPrices({ ...product, priceHistory })
      })

    case 'replaceData':
      return { ...action.data, hydrated: true }

    case 'resetToSeed':
      return {
        ...createInitialData(),
        settings: { ...defaultSettings(), theme: state.settings.theme },
        hydrated: true,
      }

    default:
      return state
  }
}
