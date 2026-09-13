/**
 * Currency support, built from the runtime's own ISO 4217 data rather than a
 * hand-maintained table — so the list is complete and the minor-unit rules are
 * correct (JPY has none, KWD and BHD have three).
 */

/** Used when the runtime predates `Intl.supportedValuesOf`. */
const FALLBACK_CODES = [
  'AED', 'ARS', 'AUD', 'BDT', 'BGN', 'BHD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK',
  'DKK', 'EGP', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JOD',
  'JPY', 'KES', 'KRW', 'KWD', 'LBP', 'LKR', 'MAD', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'OMR',
  'PHP', 'PKR', 'PLN', 'QAR', 'RON', 'RSD', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TWD',
  'UAH', 'USD', 'VND', 'ZAR',
]

export interface CurrencyInfo {
  code: string
  name: string
  /** Localised symbol, e.g. `$`, `£`, or the code itself when there is none. */
  symbol: string
  /** Minor units the currency actually uses. */
  digits: number
}

function safeDisplayNames(): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' })
  } catch {
    return null
  }
}

function describe(code: string, names: Intl.DisplayNames | null): CurrencyInfo {
  let symbol = code
  let digits = 2
  try {
    const formatter = new Intl.NumberFormat('en', { style: 'currency', currency: code })
    symbol = formatter.formatToParts(1).find((part) => part.type === 'currency')?.value ?? code
    digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    /* unknown code: fall back to the code itself with two decimals */
  }
  let name = code
  try {
    name = names?.of(code) ?? code
  } catch {
    /* leave the code as the name */
  }
  return { code, name, symbol, digits }
}

let cachedList: CurrencyInfo[] | null = null

/** Every currency this runtime knows about, sorted by name. */
export function allCurrencies(): CurrencyInfo[] {
  if (cachedList) return cachedList
  let codes: string[]
  try {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf
    codes = supported ? supported('currency') : FALLBACK_CODES
  } catch {
    codes = FALLBACK_CODES
  }
  if (!codes || codes.length === 0) codes = FALLBACK_CODES

  const names = safeDisplayNames()
  cachedList = codes
    .map((code) => describe(code, names))
    .sort((a, b) => a.name.localeCompare(b.name))
  return cachedList
}

const infoCache = new Map<string, CurrencyInfo>()

export function currencyInfo(code: string): CurrencyInfo {
  const upper = (code || 'AED').toUpperCase()
  const cached = infoCache.get(upper)
  if (cached) return cached
  const found = allCurrencies().find((entry) => entry.code === upper) ?? describe(upper, safeDisplayNames())
  infoCache.set(upper, found)
  return found
}

export function isKnownCurrency(code: string): boolean {
  return allCurrencies().some((entry) => entry.code === code.toUpperCase())
}

/** Currencies most likely wanted for a Gulf shopping trip, shown first in pickers. */
export const SUGGESTED_CURRENCIES = [
  'AED', 'USD', 'EUR', 'GBP', 'INR', 'PKR', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'EGP',
]

/** Fuzzy search over code, name and symbol. */
export function searchCurrencies(query: string, limit = 60): CurrencyInfo[] {
  const term = query.trim().toLowerCase()
  const list = allCurrencies()
  if (term === '') {
    const suggested = SUGGESTED_CURRENCIES.map((code) => currencyInfo(code))
    const rest = list.filter((entry) => !SUGGESTED_CURRENCIES.includes(entry.code))
    return [...suggested, ...rest].slice(0, limit)
  }
  const scored = list
    .map((entry) => {
      const code = entry.code.toLowerCase()
      const name = entry.name.toLowerCase()
      let score = -1
      if (code === term) score = 0
      else if (code.startsWith(term)) score = 1
      else if (name.startsWith(term)) score = 2
      else if (name.includes(term)) score = 3
      else if (entry.symbol.toLowerCase() === term) score = 4
      return { entry, score }
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name))
  return scored.slice(0, limit).map((item) => item.entry)
}
