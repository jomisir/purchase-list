import type {
  AppData,
  Currency,
  ExchangeRates,
  PriceRecord,
  Product,
  Settings,
  ThemePreference,
} from '@/types'
import { createId } from '@/lib/id'
import { isoDate, nowIso } from '@/lib/date'
import { compareRecordDate } from '@/lib/calc'
import { createSeedProducts, DEFAULT_BUDGET, DEFAULT_CURRENCY, SEED_VERSION } from '@/data/seed'
import { convert, emptyRates, rebase } from '@/lib/rates'
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
  Partial<Pick<Product, 'purchased' | 'purchasedAt' | 'isCustom' | 'currency'>>

export type PriceRecordDraft = Omit<PriceRecord, 'id' | 'productId' | 'currency' | 'source'> &
  Partial<Pick<PriceRecord, 'source' | 'currency'>>

export type PlannerAction =
  | { type: 'hydrate'; data: AppData | null }
  | { type: 'setBudget'; budget: number }
  | { type: 'setTheme'; theme: ThemePreference }
  | { type: 'setCurrency'; currency: Currency; convertAmounts: boolean }
  | { type: 'setRates'; rates: ExchangeRates }
  | { type: 'setRateOverride'; code: Currency; rate: number | null }
  | { type: 'setAutoRefreshRates'; enabled: boolean }
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
    budget: DEFAULT_BUDGET,
    currency: DEFAULT_CURRENCY,
    theme: 'system',
    rates: emptyRates(DEFAULT_CURRENCY),
    autoRefreshRates: true,
  }
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
      return { ...data, hydrated: true }
    }

    case 'setBudget':
      return {
        ...state,
        settings: { ...state.settings, budget: Math.max(0, action.budget) },
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
      const budgetInNext = convertOrNull(state.settings.budget, previous, next, state.settings.rates)

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
        settings: {
          ...state.settings,
          currency: next,
          budget: budgetInNext ?? state.settings.budget,
          rates,
        },
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

    case 'addProduct': {
      const timestamp = nowIso()
      const product: Product = {
        ...action.draft,
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
