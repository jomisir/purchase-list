import { createContext, useContext } from 'react'
import type { AppData, Product, ThemePreference } from '@/types'
import type { PlannerState, PriceRecordDraft, ProductDraft } from './plannerReducer'

export interface PlannerActions {
  setBudget: (budget: number) => void
  setTheme: (theme: ThemePreference) => void
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
