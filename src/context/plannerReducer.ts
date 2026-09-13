import type {
  AppData,
  Currency,
  ShoppingListMeta,
  ExchangeRates,
  PriceRecord,
  Product,
  Settings,
  ThemePreference,
} from '@/types'
import { createId } from '@/lib/id'
import { isoDate, nowIso } from '@/lib/date'
import { APPROACHING_THRESHOLD, clampThreshold, compareRecordDate } from '@/lib/calc'
import { createSeedProducts, DEFAULT_BUDGET, DEFAULT_CURRENCY, SEED_VERSION } from '@/data/seed'
import { convert, emptyRates, rebase } from '@/lib/rates'
import { DATA_VERSION } from '@/lib/transfer'
import { createList, DEFAULT_LIST_NAME, MAX_LISTS, migrateToLists } from '@/lib/lists'

export interface PlannerState extends AppData {
  /** False until storage has been read, so the UI can avoid a flash of seed data. */
  hydrated: boolean
}

export type ProductDraft = Omit<
  Product,
  | 'id'
  | 'listId'
  | 'dateAdded'
  | 'lastUpdated'
  | 'priceHistory'
  | 'currency'
  | 'purchased'
  | 'purchasedAt'
  | 'isCustom'
> &
  Partial<Pick<Product, 'purchased' | 'purchasedAt' | 'isCustom' | 'currency'>>

export type PriceRecordDraft = Omit<PriceRecord, 'id' | 'productId' | 'currency' | 'source'> &
  Partial<Pick<PriceRecord, 'source' | 'currency'>>

export type PlannerAction =
  | { type: 'hydrate'; data: AppData | null }
  | { type: 'setBudget'; budget: number; listId?: string }
  | { type: 'setTheme'; theme: ThemePreference }
  | { type: 'setCurrency'; currency: Currency; convertAmounts: boolean }
  | { type: 'setRates'; rates: ExchangeRates }
  | { type: 'setRateOverride'; code: Currency; rate: number | null }
  | { type: 'setAutoRefreshRates'; enabled: boolean }
  | { type: 'setAlertThreshold'; threshold: number }
  | { type: 'setActiveList'; listId: string }
  | { type: 'createList'; name: string; budget: number; copyStarter: boolean; id?: string }
  | { type: 'renameList'; listId: string; name: string }
  | { type: 'deleteList'; listId: string }
  | { type: 'moveProduct'; productId: string; listId: string }
  | { type: 'addProduct'; draft: ProductDraft; id?: string }
  | { type: 'updateProduct'; id: string; patch: Partial<Product> }
  | { type: 'deleteProduct'; id: string }
  | { type: 'setPurchased'; id: string; purchased: boolean; actualPrice?: number | null }
  | { type: 'addPriceRecord'; productId: string; draft: PriceRecordDraft }
  | { type: 'deletePriceRecord'; productId: string; recordId: string }
  | { type: 'replaceData'; data: AppData }
  | { type: 'resetToSeed' }

export function defaultSettings(): Settings {
  return {
    currency: DEFAULT_CURRENCY,
    theme: 'system',
    rates: emptyRates(DEFAULT_CURRENCY),
    autoRefreshRates: true,
    alertThreshold: APPROACHING_THRESHOLD,
  }
}

export function createInitialData(): AppData {
  const list = createList(DEFAULT_LIST_NAME, DEFAULT_BUDGET)
  return {
    version: DATA_VERSION,
    lists: [list],
    activeListId: list.id,
    products: createSeedProducts().map((product) => ({ ...product, listId: list.id })),
    settings: defaultSettings(),
    seedVersion: SEED_VERSION,
  }
}

export const initialState: PlannerState = {
  ...createInitialData(),
  products: [],
  hydrated: false,
}

/** Products of the list currently being viewed. */
export function activeProducts(state: PlannerState): Product[] {
  return state.products.filter((product) => product.listId === state.activeListId)
}

/** The active list's own budget. */
export function activeBudget(state: PlannerState): number {
  return state.lists.find((list) => list.id === state.activeListId)?.budget ?? 0
}

/**
 * Recomputes the fields that are derived from a product's price history:
 * the current price is always the most recently dated observation.
 */
/** Local helper so the reducer stays free of import cycles. */
function convertOrNull(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRates,
): number | null {
  const converted = convert(amount, from, to, rates)
  return converted == null ? null : Math.round(converted * 1_000_000) / 1_000_000
}

/**
 * Recomputes the fields derived from a product's price history.
 *
 * `currentPrice` is defined as a per-unit amount in the PRODUCT's currency, so a
 * price seen abroad has to be converted before it can take that slot — otherwise
 * a $60 sighting would render as "AED 60". When there is no rate to do that
 * with, the previous current price stands and the sighting still lives in the
 * history under its own currency, which is the honest outcome.
 */
function withDerivedPrices(product: Product, rates?: ExchangeRates): Product {
  if (product.priceHistory.length === 0) return product
  const sorted = [...product.priceHistory].sort(compareRecordDate)
  const latest = sorted[sorted.length - 1]

  const sameCurrency = latest.currency.toUpperCase() === product.currency.toUpperCase()
  const inProductCurrency = sameCurrency
    ? latest.price
    : rates
      ? convertOrNull(latest.price, latest.currency, product.currency, rates)
      : null

  if (inProductCurrency == null) {
    return { ...product, priceHistory: sorted }
  }

  return {
    ...product,
    priceHistory: sorted,
    currentPrice: inProductCurrency,
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
      return { ...data, ...migrateToLists(data), hydrated: true }
    }

    case 'setBudget': {
      // The budget belongs to a list, not to the app. Without a list named it
      // is the one being viewed — naming one lets Settings edit a list you are
      // not currently in without dragging you over to it.
      const budget = Math.max(0, action.budget)
      const target = action.listId ?? state.activeListId
      return {
        ...state,
        lists: state.lists.map((list) => (list.id === target ? { ...list, budget } : list)),
      }
    }

    case 'setActiveList':
      return state.lists.some((list) => list.id === action.listId)
        ? { ...state, activeListId: action.listId }
        : state

    case 'createList': {
      if (state.lists.length >= MAX_LISTS) return state
      const list: ShoppingListMeta = {
        ...createList(action.name, action.budget),
        ...(action.id ? { id: action.id } : {}),
      }
      const products = action.copyStarter
        ? createSeedProducts().map((product) => ({
            ...product,
            id: `${list.id}__${product.id}`,
            listId: list.id,
          }))
        : []
      return {
        ...state,
        lists: [...state.lists, list],
        activeListId: list.id,
        products: [...state.products, ...products],
      }
    }

    case 'renameList': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId ? { ...list, name } : list,
        ),
      }
    }

    case 'deleteList': {
      // Never leave the app with nowhere to put a product.
      if (state.lists.length <= 1) return state
      if (!state.lists.some((list) => list.id === action.listId)) return state
      const lists = state.lists.filter((list) => list.id !== action.listId)
      return {
        ...state,
        lists,
        products: state.products.filter((product) => product.listId !== action.listId),
        activeListId: state.activeListId === action.listId ? lists[0].id : state.activeListId,
      }
    }

    case 'moveProduct': {
      if (!state.lists.some((list) => list.id === action.listId)) return state
      return mapProduct(state, action.productId, (product) => ({
        ...product,
        listId: action.listId,
      }))
    }

    case 'setTheme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }

    case 'setCurrency': {
      const next = action.currency.toUpperCase()
      const previous = state.settings.currency.toUpperCase()
      if (next === previous) return state
      const rates = rebase(state.settings.rates, next)

      // Re-basing the budget keeps its real value; without a rate the number is
      // kept as typed rather than silently becoming a different amount.
      const convertBudgets = (lists: ShoppingListMeta[]) =>
        lists.map((list) => ({
          ...list,
          budget:
            convertOrNull(list.budget, previous, next, state.settings.rates) ?? list.budget,
        }))

      if (!action.convertAmounts) {
        return {
          ...state,
          settings: { ...state.settings, currency: next, rates },
        }
      }

      const products = state.products.map((product) => {
        if (product.currency.toUpperCase() !== previous) return product
        const scale = (value: number | null | undefined) =>
          value == null ? value ?? null : convertOrNull(value, previous, next, state.settings.rates)
        const estimatedPrice = scale(product.estimatedPrice)
        if (estimatedPrice == null) return product
        return {
          ...product,
          currency: next,
          estimatedPrice,
          targetPrice: scale(product.targetPrice) ?? product.targetPrice,
          targetMin: scale(product.targetMin) ?? product.targetMin,
          targetMax: scale(product.targetMax) ?? product.targetMax,
          currentPrice: scale(product.currentPrice) ?? product.currentPrice,
          actualPrice: scale(product.actualPrice) ?? product.actualPrice,
          priceHistory: product.priceHistory.map((record) =>
            record.currency.toUpperCase() === previous
              ? { ...record, currency: next, price: scale(record.price) ?? record.price }
              : record,
          ),
        }
      })

      return {
        ...state,
        products,
        lists: convertBudgets(state.lists),
        settings: { ...state.settings, currency: next, rates },
      }
    }

    case 'setRates':
      return { ...state, settings: { ...state.settings, rates: action.rates } }

    case 'setRateOverride': {
      const code = action.code.toUpperCase()
      const overrides = { ...(state.settings.rates.overrides ?? {}) }
      const values = { ...state.settings.rates.values }
      if (action.rate == null || !Number.isFinite(action.rate) || action.rate <= 0) {
        delete overrides[code]
      } else {
        overrides[code] = action.rate
        values[code] = action.rate
      }
      return {
        ...state,
        settings: {
          ...state.settings,
          rates: {
            ...state.settings.rates,
            values,
            overrides,
            source: Object.keys(overrides).length > 0 ? 'manual' : state.settings.rates.source,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    }

    case 'setAutoRefreshRates':
      return { ...state, settings: { ...state.settings, autoRefreshRates: action.enabled } }

    case 'setAlertThreshold':
      return {
        ...state,
        settings: { ...state.settings, alertThreshold: clampThreshold(action.threshold) },
      }

    case 'addProduct': {
      const timestamp = nowIso()
      const product: Product = {
        ...action.draft,
        listId: state.activeListId,
        id: action.id ?? createId('product'),
        currency: action.draft.currency ?? DEFAULT_CURRENCY,
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
            currency: product.currency,
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
        withDerivedPrices({ ...product, ...action.patch, id: product.id }, state.settings.rates),
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
              currency: product.currency,
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
        withDerivedPrices(
          {
            ...product,
            priceHistory: [
              ...product.priceHistory,
              {
                ...action.draft,
                id: createId('price'),
                productId: product.id,
                currency: action.draft.currency ?? product.currency,
                source: action.draft.source ?? 'manual',
              },
            ],
          },
          state.settings.rates,
        ),
      )

    case 'deletePriceRecord':
      return mapProduct(state, action.productId, (product) => {
        const priceHistory = product.priceHistory.filter(
          (record) => record.id !== action.recordId,
        )
        if (priceHistory.length === 0) {
          return { ...product, priceHistory, currentPrice: null }
        }
        return withDerivedPrices({ ...product, priceHistory }, state.settings.rates)
      })

    case 'replaceData':
      return { ...action.data, ...migrateToLists(action.data), hydrated: true }

    case 'resetToSeed': {
      const fresh = createInitialData()
      return {
        ...fresh,
        settings: {
          ...defaultSettings(),
          theme: state.settings.theme,
          currency: state.settings.currency,
          rates: state.settings.rates,
          autoRefreshRates: state.settings.autoRefreshRates,
          alertThreshold: state.settings.alertThreshold,
        },
        hydrated: true,
      }
    }

    default:
      return state
  }
}
