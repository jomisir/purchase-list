import type { Currency, ExchangeRates, Product } from '@/types'
import { lineActual } from '@/lib/calc'
import { convert } from '@/lib/rates'
import { roundMoney } from '@/lib/money'
import { isoDate } from '@/lib/date'

/** Beyond this many days the gap-filling is dropped and only real days plot. */
const MAX_FILLED_DAYS = 180

export interface SpendPoint {
  /** ISO day, YYYY-MM-DD. */
  date: string
  /** Spent on this day alone, in the home currency. */
  daySpend: number
  /** Running total up to and including this day. */
  total: number
  /** What was bought that day, for the tooltip and the table view. */
  items: { id: string; name: string; amount: number }[]
}

export interface SpendingSeries {
  points: SpendPoint[]
  total: number
  /** Days between the first and last purchase, inclusive. */
  daySpan: number
  /** Purchases left out because their currency has no usable rate. */
  unconverted: { id: string; name: string; currency: Currency }[]
  busiest: SpendPoint | null
}

function dayOf(product: Product): string | null {
  const stamp = product.purchasedAt ?? product.lastUpdated
  if (!stamp) return null
  const date = new Date(stamp)
  if (Number.isNaN(date.getTime())) return null
  return isoDate(date)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Cumulative spend per day, in the home currency.
 *
 * Days with no purchases are filled in so the x-axis stays proportional to real
 * time — a flat stretch means a day where nothing was bought, which is true and
 * worth seeing. Anything that cannot be converted is reported rather than
 * counted at the wrong value, matching how the budget totals behave.
 */
export function spendingSeries(
  products: Product[],
  currency: Currency = 'AED',
  rates?: ExchangeRates,
  today: string = isoDate(),
): SpendingSeries {
  const byDay = new Map<string, SpendPoint>()
  const unconverted: SpendingSeries['unconverted'] = []

  for (const product of products) {
    if (!product.purchased || product.actualPrice == null) continue
    const day = dayOf(product)
    if (!day) continue

    const paid = lineActual(product)
    const sameCurrency = product.currency.toUpperCase() === currency.toUpperCase()
    const amount = sameCurrency
      ? paid
      : rates
        ? convert(paid, product.currency, currency, rates)
        : null

    if (amount == null) {
      unconverted.push({ id: product.id, name: product.name, currency: product.currency })
      continue
    }

    const entry = byDay.get(day) ?? { date: day, daySpend: 0, total: 0, items: [] }
    entry.daySpend = roundMoney(entry.daySpend + amount, currency)
    entry.items.push({ id: product.id, name: product.name, amount: roundMoney(amount, currency) })
    byDay.set(day, entry)
  }

  const days = [...byDay.keys()].sort()
  if (days.length === 0) {
    return { points: [], total: 0, daySpan: 0, unconverted, busiest: null }
  }

  const first = days[0]
  const last = days[days.length - 1] > today ? days[days.length - 1] : today
  const span = daysBetween(first, last)

  // Start one day before the first purchase so the area rises from zero rather
  // than appearing as a block already at full height.
  const timeline: string[] =
    span >= 0 && span <= MAX_FILLED_DAYS
      ? Array.from({ length: span + 2 }, (_, index) => addDays(first, index - 1))
      : [addDays(first, -1), ...days]

  let running = 0
  const points: SpendPoint[] = timeline.map((date) => {
    const entry = byDay.get(date)
    running = roundMoney(running + (entry?.daySpend ?? 0), currency)
    return {
      date,
      daySpend: entry?.daySpend ?? 0,
      total: running,
      items: entry?.items ?? [],
    }
  })

  const busiest = points.reduce<SpendPoint | null>(
    (best, point) => (point.daySpend > (best?.daySpend ?? 0) ? point : best),
    null,
  )

  return {
    points,
    total: running,
    daySpan: daysBetween(first, days[days.length - 1]) + 1,
    unconverted,
    busiest,
  }
}
