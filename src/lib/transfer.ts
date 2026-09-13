import type {
  AppData,
  Category,
  ExchangeRates,
  PriceRecord,
  Product,
  ProductImage,
  Settings,
} from '@/types'
import { CATEGORIES } from '@/types'
import { DEFAULT_CURRENCY, SEED_VERSION } from '@/data/seed'
import { createId } from '@/lib/id'
import { emptyRates } from '@/lib/rates'
import { migrateToLists } from '@/lib/lists'
import { APPROACHING_THRESHOLD, clampThreshold } from '@/lib/calc'
import { isKnownCurrency } from '@/lib/currency'
import { isoDate, nowIso } from '@/lib/date'

export const DATA_VERSION = 1

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asPositive(value: unknown, fallback: number): number {
  const parsed = asFiniteNumber(value)
  if (parsed == null || parsed < 0) return fallback
  return parsed
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function asCategory(value: unknown): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : 'Other'
}

function asImage(value: unknown): ProductImage | null {
  if (!isObject(value)) return null
  if (value.kind === 'builtin' && typeof value.key === 'string') {
    return { kind: 'builtin', key: value.key }
  }
  if (value.kind === 'data' && typeof value.dataUrl === 'string') {
    if (!value.dataUrl.startsWith('data:image/')) return null
    return {
      kind: 'data',
      dataUrl: value.dataUrl,
      name: asOptionalString(value.name),
    }
  }
  if (value.kind === 'url' && typeof value.url === 'string') {
    return { kind: 'url', url: value.url }
  }
  return null
}

function asPriceRecord(value: unknown, productId: string): PriceRecord | null {
  if (!isObject(value)) return null
  const price = asFiniteNumber(value.price)
  if (price == null || price < 0) return null
  const rawDate = typeof value.date === 'string' ? value.date.slice(0, 10) : ''
  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('price'),
    productId,
    price,
    currency: asCurrency(value.currency, DEFAULT_CURRENCY),
    store: asOptionalString(value.store),
    date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : isoDate(),
    notes: asOptionalString(value.notes),
    url: asOptionalString(value.url),
    source:
      value.source === 'manual' ||
      value.source === 'seed' ||
      value.source === 'purchase' ||
      value.source === 'import'
        ? value.source
        : 'import',
  }
}

/** Coerces anything product-shaped into a valid Product, or returns null. */
export function normalizeProduct(value: unknown): Product | null {
  if (!isObject(value)) return null
  const name = asOptionalString(value.name)
  if (!name) return null

  const id = typeof value.id === 'string' && value.id ? value.id : createId('product')
  const estimatedPrice = asPositive(value.estimatedPrice ?? value.price, 0)
  const currentPrice = asFiniteNumber(value.currentPrice)
  const actualPrice = asFiniteNumber(value.actualPrice)
  const targetPrice = asFiniteNumber(value.targetPrice)
  const quantity = Math.max(1, Math.round(asPositive(value.quantity, 1)))
  const history = Array.isArray(value.priceHistory)
    ? value.priceHistory
        .map((record) => asPriceRecord(record, id))
        .filter((record): record is PriceRecord => record !== null)
    : []

  const timestamp = typeof value.dateAdded === 'string' ? value.dateAdded : nowIso()

  return {
    id,
    // A missing or unknown list is repaired by the migration below, which
    // adopts the product rather than dropping it.
    listId: typeof value.listId === 'string' ? value.listId : '',
    name,
    category: asCategory(value.category),
    brand: asOptionalString(value.brand),
    image: asImage(value.image),
    quantity,
    targetPrice: targetPrice != null && targetPrice >= 0 ? targetPrice : null,
    targetMin: asFiniteNumber(value.targetMin),
    targetMax: asFiniteNumber(value.targetMax),
    estimatedPrice,
    currentPrice: currentPrice != null && currentPrice >= 0 ? currentPrice : null,
    actualPrice: actualPrice != null && actualPrice >= 0 ? actualPrice : null,
    currency: asCurrency(value.currency, DEFAULT_CURRENCY),
    purchased: Boolean(value.purchased),
    purchasedAt: typeof value.purchasedAt === 'string' ? value.purchasedAt : null,
    notes: asOptionalString(value.notes),
    store: asOptionalString(value.store),
    productUrl: asOptionalString(value.productUrl),
    dateAdded: timestamp,
    lastUpdated: typeof value.lastUpdated === 'string' ? value.lastUpdated : timestamp,
    isCustom: Boolean(value.isCustom),
    priceHistory: history,
    alternativeToId: typeof value.alternativeToId === 'string' ? value.alternativeToId : null,
  }
}

function asCurrency(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const code = value.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) && isKnownCurrency(code) ? code : fallback
}

function normalizeRates(value: unknown, base: string): ExchangeRates {
  if (!isObject(value)) return emptyRates(base)
  const values: Record<string, number> = {}
  const rawValues = isObject(value.values) ? value.values : {}
  for (const [code, rate] of Object.entries(rawValues)) {
    const parsed = asFiniteNumber(rate)
    if (parsed != null && parsed > 0 && /^[A-Z]{3}$/i.test(code)) {
      values[code.toUpperCase()] = parsed
    }
  }
  const overrides: Record<string, number> = {}
  const rawOverrides = isObject(value.overrides) ? value.overrides : {}
  for (const [code, rate] of Object.entries(rawOverrides)) {
    const parsed = asFiniteNumber(rate)
    if (parsed != null && parsed > 0 && /^[A-Z]{3}$/i.test(code)) {
      overrides[code.toUpperCase()] = parsed
    }
  }
  const ratesBase = asCurrency(value.base, base)
  values[ratesBase] = 1
  const source = value.source
  return {
    base: ratesBase,
    values,
    overrides,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    source: source === 'api' || source === 'manual' || source === 'none' ? source : 'none',
    provider: asOptionalString(value.provider),
  }
}

function normalizeSettings(value: unknown): Settings {
  const settings = isObject(value) ? value : {}
  const theme = settings.theme
  const currency = asCurrency(settings.currency, DEFAULT_CURRENCY)
  // Any budget found here belongs to the pre-lists shape and is picked up by
  // `legacyBudget` below, which hands it to the list the migration creates.
  return {
    currency,
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
    rates: normalizeRates(settings.rates, currency),
    autoRefreshRates: settings.autoRefreshRates !== false,
    alertThreshold: clampThreshold(asFiniteNumber(settings.alertThreshold) ?? APPROACHING_THRESHOLD),
  }
}

/** The pre-lists shape kept a single global budget on settings. */
function legacyBudget(value: unknown): number | undefined {
  if (!isObject(value)) return undefined
  const budget = asFiniteNumber(value.budget)
  return budget != null && budget >= 0 ? budget : undefined
}

/** Defensive read of whatever came back from storage. */
export function normalizeAppData(value: unknown): AppData | null {
  if (!isObject(value)) return null
  const rawProducts = Array.isArray(value.products) ? value.products : null
  if (!rawProducts) return null
  const products = rawProducts
    .map(normalizeProduct)
    .filter((product): product is Product => product !== null)
  const settings = normalizeSettings(value.settings)

  // Older exports have no lists at all; everything in them becomes one list,
  // carrying across whatever global budget that file was saved with.
  const migrated = migrateToLists({
    products,
    settings: { budget: legacyBudget(value.settings) },
    lists: value.lists,
    activeListId: value.activeListId,
  })

  return {
    version: asPositive(value.version, DATA_VERSION),
    lists: migrated.lists,
    activeListId: migrated.activeListId,
    products: migrated.products,
    settings,
    seedVersion: asPositive(value.seedVersion, SEED_VERSION),
  }
}

export interface ExportFile {
  app: 'shopping-list'
  version: number
  exportedAt: string
  productCount: number
  data: AppData
}

export function buildExport(data: AppData): ExportFile {
  return {
    app: 'shopping-list',
    version: DATA_VERSION,
    exportedAt: nowIso(),
    productCount: data.products.length,
    data,
  }
}

export function serializeExport(data: AppData): string {
  return JSON.stringify(buildExport(data), null, 2)
}

export interface ImportResult {
  data: AppData
  productCount: number
  skipped: number
}

/**
 * Parses an exported file. Accepts both the wrapped export format and a bare
 * AppData object, and explains exactly what is wrong when it cannot.
 */
export function parseImport(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportError(
      'That file is not valid JSON. Choose a file exported from this app (Settings → Export).',
    )
  }

  if (!isObject(parsed)) {
    throw new ImportError('That file does not contain shopping planner data.')
  }

  const candidate = isObject(parsed.data) ? parsed.data : parsed
  if (!Array.isArray((candidate as Record<string, unknown>).products)) {
    throw new ImportError(
      'No product list found in that file. Expected a backup exported from this app.',
    )
  }

  const rawCount = ((candidate as Record<string, unknown>).products as unknown[]).length
  const data = normalizeAppData(candidate)
  if (!data) {
    throw new ImportError('That backup could not be read. Its structure is not recognised.')
  }
  if (data.products.length === 0) {
    throw new ImportError(
      rawCount === 0
        ? 'That backup contains no products.'
        : 'None of the products in that file could be read — each one needs at least a name.',
    )
  }

  return {
    data,
    productCount: data.products.length,
    skipped: rawCount - data.products.length,
  }
}
