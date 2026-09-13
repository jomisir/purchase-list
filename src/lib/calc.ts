import type {
  BudgetStatus,
  BudgetTotals,
  DealStatus,
  PriceRecord,
  PriceStats,
  Product,
  ProductStatusFilter,
  SortKey,
} from '@/types'
import { roundMoney } from '@/lib/money'

/** Share of the budget at which the app starts warning. */
export const APPROACHING_THRESHOLD = 0.8
/** A price at or below target × this is flagged as a great deal. */
export const GREAT_DEAL_FACTOR = 0.9

export function lineEstimate(product: Product): number {
  return roundMoney(product.estimatedPrice * product.quantity)
}

export function lineTarget(product: Product): number | null {
  if (product.targetPrice == null) return null
  return roundMoney(product.targetPrice * product.quantity)
}

export function lineCurrent(product: Product): number | null {
  if (product.currentPrice == null) return null
  return roundMoney(product.currentPrice * product.quantity)
}

/** What was actually paid for the whole line, or 0 when not bought yet. */
export function lineActual(product: Product): number {
  if (!product.purchased || product.actualPrice == null) return 0
  return roundMoney(product.actualPrice * product.quantity)
}

/**
 * The most trustworthy per-unit price known for a product: what was paid,
 * else the last price seen in a store, else the planning estimate.
 */
export function bestKnownPrice(product: Product): number {
  if (product.purchased && product.actualPrice != null) return product.actualPrice
  if (product.currentPrice != null) return product.currentPrice
  return product.estimatedPrice
}

export function budgetStatusFor(percentUsed: number): BudgetStatus {
  if (percentUsed > 100) return 'over'
  if (percentUsed >= APPROACHING_THRESHOLD * 100) return 'approaching'
  return 'under'
}

export function computeTotals(products: Product[], budget: number): BudgetTotals {
  let estimatedTotal = 0
  let actualTotal = 0
  let projectedTotal = 0
  let estimateOfPurchased = 0
  let purchasedCount = 0

  for (const product of products) {
    const estimate = lineEstimate(product)
    estimatedTotal += estimate

    if (product.purchased) {
      purchasedCount += 1
      const paid = lineActual(product)
      actualTotal += paid
      estimateOfPurchased += estimate
      // An item marked bought without a price still costs at least its estimate.
      projectedTotal += product.actualPrice == null ? estimate : paid
    } else {
      projectedTotal += roundMoney(bestKnownPrice(product) * product.quantity)
    }
  }

  estimatedTotal = roundMoney(estimatedTotal)
  actualTotal = roundMoney(actualTotal)
  projectedTotal = roundMoney(projectedTotal)

  const percentUsed = budget > 0 ? (actualTotal / budget) * 100 : actualTotal > 0 ? 100 : 0

  return {
    budget,
    estimatedTotal,
    actualTotal,
    remaining: roundMoney(budget - actualTotal),
    percentUsed,
    status: budgetStatusFor(percentUsed),
    projectedTotal,
    projectedRemaining: roundMoney(budget - projectedTotal),
    purchasedCount,
    totalCount: products.length,
    completion: products.length === 0 ? 0 : (purchasedCount / products.length) * 100,
    varianceOnPurchased: roundMoney(actualTotal - estimateOfPurchased),
  }
}

/**
 * Deal label for a product, derived purely from the prices already stored.
 * Returns `null` when there is nothing to compare, so the UI can say so
 * instead of inventing a verdict.
 */
export function dealStatus(product: Product): DealStatus | null {
  const target = product.targetPrice
  const current = product.purchased && product.actualPrice != null
    ? product.actualPrice
    : product.currentPrice
  if (target == null || current == null || target <= 0) return null
  if (current <= roundMoney(target * GREAT_DEAL_FACTOR)) return 'great'
  if (current < target) return 'good'
  if (current > target) return 'above'
  return 'at'
}

export const DEAL_LABELS: Record<DealStatus, string> = {
  great: 'Great deal',
  good: 'Good deal',
  at: 'At target',
  above: 'Above target',
}

export function priceStats(history: PriceRecord[]): PriceStats {
  if (history.length === 0) {
    return {
      lowest: null,
      highest: null,
      average: null,
      latest: null,
      lowestRecord: null,
      latestRecord: null,
      count: 0,
    }
  }
  const sortedByDate = [...history].sort((a, b) => compareRecordDate(a, b))
  const prices = history.map((record) => record.price)
  const lowestRecord = history.reduce((best, record) =>
    record.price < best.price ? record : best,
  )
  const latestRecord = sortedByDate[sortedByDate.length - 1]
  return {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: roundMoney(prices.reduce((sum, price) => sum + price, 0) / prices.length),
    latest: latestRecord.price,
    lowestRecord,
    latestRecord,
    count: history.length,
  }
}

/** Chronological order, falling back to insertion order for same-day records. */
export function compareRecordDate(a: PriceRecord, b: PriceRecord): number {
  if (a.date === b.date) return a.id.localeCompare(b.id)
  return a.date < b.date ? -1 : 1
}

export function sortHistory(history: PriceRecord[]): PriceRecord[] {
  return [...history].sort(compareRecordDate)
}

export interface PriceDifference {
  /** Positive means over the estimate, negative means saved. */
  amount: number
  direction: 'saved' | 'over' | 'equal'
  label: string
}

/** Difference between what was paid and what was estimated, for the whole line. */
export function priceDifference(product: Product): PriceDifference | null {
  if (!product.purchased || product.actualPrice == null) return null
  const diff = roundMoney(lineActual(product) - lineEstimate(product))
  if (diff === 0) return { amount: 0, direction: 'equal', label: 'Exactly on estimate' }
  return {
    amount: diff,
    direction: diff < 0 ? 'saved' : 'over',
    label: diff < 0 ? 'under estimate' : 'above estimate',
  }
}

/** Gap between the current observed price and the target, per unit. */
export function targetDifference(product: Product): number | null {
  if (product.targetPrice == null || product.currentPrice == null) return null
  return roundMoney(product.currentPrice - product.targetPrice)
}

export function matchesSearch(product: Product, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (term === '') return true
  const haystack = [
    product.name,
    product.brand ?? '',
    product.category,
    product.store ?? '',
    product.notes ?? '',
    ...product.priceHistory.map((record) => record.store ?? ''),
  ]
    .join(' ')
    .toLowerCase()
  return term
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

export function matchesStatus(product: Product, filter: ProductStatusFilter): boolean {
  switch (filter) {
    case 'todo':
      return !product.purchased
    case 'bought':
      return product.purchased
    case 'overTarget':
      return dealStatus(product) === 'above'
    case 'deals': {
      const deal = dealStatus(product)
      return deal === 'good' || deal === 'great'
    }
    case 'all':
    default:
      return true
  }
}

export const SORT_LABELS: Record<SortKey, string> = {
  default: 'Planner order',
  priceAsc: 'Price: low to high',
  priceDesc: 'Price: high to low',
  recentlyAdded: 'Recently added',
  recentlyUpdated: 'Recently updated',
  purchasedFirst: 'Purchased first',
  notPurchasedFirst: 'Still to buy first',
  category: 'Category',
  bestVsTarget: 'Best price vs target',
}

/**
 * How far below target a product's observed price sits, as a share of target.
 * Negative numbers are bargains, so ascending order puts the best deals first.
 */
function vsTargetScore(product: Product): number {
  const target = product.targetPrice
  const current = product.currentPrice ?? product.actualPrice
  if (target == null || target <= 0 || current == null) return Number.POSITIVE_INFINITY
  return (current - target) / target
}

export function sortProducts(products: Product[], key: SortKey): Product[] {
  const list = [...products]
  switch (key) {
    case 'priceAsc':
      return list.sort((a, b) => bestKnownPrice(a) * a.quantity - bestKnownPrice(b) * b.quantity)
    case 'priceDesc':
      return list.sort((a, b) => bestKnownPrice(b) * b.quantity - bestKnownPrice(a) * a.quantity)
    case 'recentlyAdded':
      return list.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    case 'recentlyUpdated':
      return list.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    case 'purchasedFirst':
      return list.sort((a, b) => Number(b.purchased) - Number(a.purchased))
    case 'notPurchasedFirst':
      return list.sort((a, b) => Number(a.purchased) - Number(b.purchased))
    case 'category':
      return list.sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      )
    case 'bestVsTarget':
      return list.sort((a, b) => vsTargetScore(a) - vsTargetScore(b))
    case 'default':
    default:
      return list
  }
}

export interface StoreQuote {
  store: string
  price: number
  date: string
  url?: string
  notes?: string
  recordId: string
}

/** One row per store, keeping that store's cheapest sighting. */
export function storeComparison(product: Product): StoreQuote[] {
  const byStore = new Map<string, StoreQuote>()
  for (const record of product.priceHistory) {
    const store = (record.store ?? '').trim() || 'Unspecified store'
    const existing = byStore.get(store.toLowerCase())
    if (!existing || record.price < existing.price) {
      byStore.set(store.toLowerCase(), {
        store,
        price: record.price,
        date: record.date,
        url: record.url,
        notes: record.notes,
        recordId: record.id,
      })
    }
  }
  return [...byStore.values()].sort((a, b) => a.price - b.price)
}

export function categoryTotals(products: Product[]) {
  const map = new Map<string, { estimated: number; actual: number; count: number; done: number }>()
  for (const product of products) {
    const entry = map.get(product.category) ?? { estimated: 0, actual: 0, count: 0, done: 0 }
    entry.estimated = roundMoney(entry.estimated + lineEstimate(product))
    entry.actual = roundMoney(entry.actual + lineActual(product))
    entry.count += 1
    entry.done += product.purchased ? 1 : 0
    map.set(product.category, entry)
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.estimated - a.estimated)
}
