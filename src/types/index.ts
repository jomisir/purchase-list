/**
 * Domain model for the shopping planner.
 *
 * Everything the app renders is derived from these structures, so the data
 * layer can be swapped (localStorage today, Supabase later) without the UI
 * knowing about it.
 */

/** An ISO 4217 code such as `AED`, `USD`, `JPY`. */
export type Currency = string

export interface ExchangeRates {
  /** Currency the rates are expressed against. */
  base: Currency
  /** Units of each currency per 1 unit of `base`. `base` itself is always 1. */
  values: Record<string, number>
  /** When these rates were fetched or last edited. */
  updatedAt: string | null
  source: 'api' | 'manual' | 'none'
  /** Where they came from, shown to the user verbatim. */
  provider?: string
  /** Rates the user typed, which survive a refresh. */
  overrides?: Record<string, number>
}

export const CATEGORIES = [
  'Electronics',
  'Shoes',
  'Clothing',
  'Perfume',
  'Watches',
  'Bags',
  'Filming',
  'Accessories',
  'Room',
  'Skateboards',
  'Skincare & Hygiene',
  'Water Bottles',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/**
 * A product picture. `builtin` keys point at artwork bundled with the app —
 * illustrations, never photographs of a specific unit — which keeps the app
 * working offline and keeps export files small.
 */
export type ProductImage =
  | { kind: 'builtin'; key: string }
  | { kind: 'data'; dataUrl: string; name?: string }
  | { kind: 'url'; url: string }

export type PriceSource = 'manual' | 'seed' | 'purchase' | 'import'

export interface PriceRecord {
  id: string
  productId: string
  price: number
  currency: Currency
  store?: string
  /** ISO date (YYYY-MM-DD) the price was observed. */
  date: string
  notes?: string
  url?: string
  source: PriceSource
}

export interface Product {
  id: string
  name: string
  category: Category
  brand?: string
  image: ProductImage | null
  quantity: number
  /** Price per unit the user is aiming for. Drives deal detection. */
  targetPrice: number | null
  /** Optional per-unit target range, for products researched as a bracket. */
  targetMin?: number | null
  targetMax?: number | null
  /** Planning estimate per unit. Never a live price. */
  estimatedPrice: number
  /** Most recent price actually observed in a store, per unit. */
  currentPrice: number | null
  /** What was actually paid, per unit. */
  actualPrice: number | null
  currency: Currency
  purchased: boolean
  purchasedAt?: string | null
  notes?: string
  store?: string
  productUrl?: string
  dateAdded: string
  lastUpdated: string
  isCustom: boolean
  priceHistory: PriceRecord[]
  /** Set when this product was added as an alternative to another one. */
  alternativeToId?: string | null
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  budget: number
  /** Currency the budget and every total are expressed in. */
  currency: Currency
  theme: ThemePreference
  rates: ExchangeRates
  /** Refresh rates in the background when they go stale. */
  autoRefreshRates: boolean
  /**
   * Share of the budget at which the app starts warning, as a fraction.
   * 0.8 means "tell me once I have spent 80%".
   */
  alertThreshold: number
}

export interface AppData {
  /** Schema version, bumped when a migration is needed. */
  version: number
  products: Product[]
  settings: Settings
  /** Which seed revision was planted, so a reset can be detected. */
  seedVersion: number
}

export type BudgetStatus = 'under' | 'approaching' | 'over'

export type DealStatus = 'great' | 'good' | 'at' | 'above'

export interface BudgetTotals {
  /** The currency every figure below is expressed in. */
  currency: Currency
  budget: number
  /** The fraction of budget that triggers the warning state. */
  alertThreshold: number
  /** The amount that threshold works out to. */
  alertAmount: number
  estimatedTotal: number
  actualTotal: number
  remaining: number
  percentUsed: number
  status: BudgetStatus
  /** Spent so far plus the best known price of everything still to buy. */
  projectedTotal: number
  projectedRemaining: number
  purchasedCount: number
  totalCount: number
  completion: number
  /** actualTotal - estimated cost of the items already bought. */
  varianceOnPurchased: number
  /**
   * Products whose currency has no usable rate, so their amounts are missing
   * from the totals above. The UI says so rather than quietly under-reporting.
   */
  unconverted: { id: string; name: string; currency: Currency }[]
}

export interface PriceStats {
  lowest: number | null
  highest: number | null
  average: number | null
  latest: number | null
  lowestRecord: PriceRecord | null
  latestRecord: PriceRecord | null
  count: number
}

export type ProductStatusFilter = 'all' | 'todo' | 'bought' | 'overTarget' | 'deals'

export type SortKey =
  | 'default'
  | 'priceAsc'
  | 'priceDesc'
  | 'recentlyAdded'
  | 'recentlyUpdated'
  | 'purchasedFirst'
  | 'notPurchasedFirst'
  | 'category'
  | 'bestVsTarget'
