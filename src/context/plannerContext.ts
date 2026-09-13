import { createContext, useContext, useMemo } from 'react'
import type {
  AppData,
  BudgetTotals,
  Currency,
  ExchangeRates,
  Product,
  ShoppingListMeta,
  ThemePreference,
} from '@/types'
import { computeTotals } from '@/lib/calc'
import type { PlannerState, PriceRecordDraft, ProductDraft } from './plannerReducer'

export interface PlannerActions {
  /** Sets a list's budget — the one you are viewing unless another is named. */
  setBudget: (budget: number, listId?: string) => void
  setTheme: (theme: ThemePreference) => void
  setCurrency: (currency: Currency, convertAmounts: boolean) => void
  setRates: (rates: ExchangeRates) => void
  setRateOverride: (code: Currency, rate: number | null) => void
  setAutoRefreshRates: (enabled: boolean) => void
  setAlertThreshold: (threshold: number) => void
  setActiveList: (listId: string) => void
  createList: (name: string, budget: number, copyStarter: boolean) => void
  renameList: (listId: string, name: string) => void
  deleteList: (listId: string) => void
  moveProduct: (productId: string, listId: string) => void
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

/** Products of the list currently being viewed. */
export function useProducts(): Product[] {
  const { state } = usePlanner()
  return useMemo(
    () => state.products.filter((product) => product.listId === state.activeListId),
    [state.products, state.activeListId],
  )
}

/** Every list, and which one is active. */
export function useLists(): { lists: ShoppingListMeta[]; activeId: string } {
  const { state } = usePlanner()
  return { lists: state.lists, activeId: state.activeListId }
}

export function useActiveList(): ShoppingListMeta | undefined {
  const { state } = usePlanner()
  return state.lists.find((list) => list.id === state.activeListId)
}

/** The active list's budget. */
export function useBudget(): number {
  return useActiveList()?.budget ?? 0
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
  const { settings, activeListId } = state
  const budget = state.lists.find((list) => list.id === activeListId)?.budget ?? 0
  return useMemo(
    () =>
      computeTotals(
        state.products.filter((product) => product.listId === activeListId),
        budget,
        settings.currency,
        settings.rates,
        settings.alertThreshold,
      ),
    [
      state.products,
      activeListId,
      budget,
      settings.currency,
      settings.rates,
      settings.alertThreshold,
    ],
  )
}
