/**
 * Domain model for the shopping planner.
 *
 * Everything the app renders is derived from these structures, so the data
 * layer can be swapped (localStorage today, Supabase later) without the UI
 * knowing about it.
 */

export type Currency = 'AED'

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
  currency: Currency
  theme: ThemePreference
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
  budget: number
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
