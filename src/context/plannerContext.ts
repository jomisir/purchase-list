import { createContext, useContext, useMemo } from 'react'
import type {
  AppData,
  BudgetTotals,
  Currency,
  ExchangeRates,
  Product,
  ThemePreference,
} from '@/types'
import { computeTotals } from '@/lib/calc'
import type { PlannerState, PriceRecordDraft, ProductDraft } from './plannerReducer'

export interface PlannerActions {
  setBudget: (budget: number) => void
  setTheme: (theme: ThemePreference) => void
  setCurrency: (currency: Currency, convertAmounts: boolean) => void
  setRates: (rates: ExchangeRates) => void
  setRateOverride: (code: Currency, rate: number | null) => void
  setAutoRefreshRates: (enabled: boolean) => void
  setAlertThreshold: (threshold: number) => void
  refreshRates: () => Promise<{ ok: boolean; message: string }>
  addProduct: (draft: ProductDraft) => string
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  setPurchased: (id: string, purchased: boolean, actualPrice?: number | null) => void
  addPriceRecord: (productId: string, draft: PriceRecordDraft) => void
  deletePriceRecord: (productId: string, recordId: string) => void
  replaceData: (data: AppData) => void
  resetToSeed: () => void
}

export interface PlannerContextValue {
  state: PlannerState
  actions: PlannerActions
  storageName: string
  storageError: string | null
}

export const PlannerContext = createContext<PlannerContextValue | null>(null)

export function usePlanner(): PlannerContextValue {
  const value = useContext(PlannerContext)
  if (!value) throw new Error('usePlanner must be used inside <PlannerProvider>')
  return value
}

export function useProducts(): Product[] {
  return usePlanner().state.products
}

export function useProduct(id: string | undefined): Product | undefined {
  const products = useProducts()
  return id ? products.find((product) => product.id === id) : undefined
}

export function useSettings() {
  return usePlanner().state.settings
}

/** The currency the budget and every total are expressed in. */
export function useCurrency(): Currency {
  return usePlanner().state.settings.currency
}

/** Budget totals for the whole plan, converted into the home currency. */
export function useTotals(): BudgetTotals {
  const { state } = usePlanner()
  const { products, settings } = state
  return useMemo(
    () =>
      computeTotals(
        products,
        settings.budget,
        settings.currency,
        settings.rates,
        settings.alertThreshold,
      ),
    [products, settings.budget, settings.currency, settings.rates, settings.alertThreshold],
  )
}
