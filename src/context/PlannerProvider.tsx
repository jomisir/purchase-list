import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData, Product, ThemePreference } from '@/types'
import { createPersistence } from '@/lib/storage'
import { normalizeAppData } from '@/lib/transfer'
import { createId } from '@/lib/id'
import {
  initialState,
  plannerReducer,
  type PriceRecordDraft,
  type ProductDraft,
} from './plannerReducer'
import { PlannerContext, type PlannerActions, type PlannerContextValue } from './plannerContext'

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plannerReducer, initialState)
  const [storageError, setStorageError] = useState<string | null>(null)
  const persistence = useMemo(() => createPersistence(), [])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load once on mount.
  useEffect(() => {
    let cancelled = false
    persistence
      .load()
      .then((stored) => {
        if (cancelled) return
        dispatch({ type: 'hydrate', data: stored ? normalizeAppData(stored) : null })
      })
      .catch(() => {
        if (cancelled) return
        setStorageError('Saved data could not be read, so the planner started fresh.')
        dispatch({ type: 'hydrate', data: null })
      })
    return () => {
      cancelled = true
    }
  }, [persistence])

  // Persist on change, debounced so typing in a form is not a write storm.
  useEffect(() => {
    if (!state.hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const { hydrated: _hydrated, ...data } = state
    saveTimer.current = setTimeout(() => {
      persistence
        .save(data as AppData)
        .then(() => setStorageError(null))
        .catch((error: unknown) =>
          setStorageError(error instanceof Error ? error.message : 'Could not save your changes.'),
        )
    }, 180)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state, persistence])

  const addProduct = useCallback((draft: ProductDraft) => {
    const id = createId('product')
    dispatch({ type: 'addProduct', draft, id })
    return id
  }, [])

  const actions = useMemo<PlannerActions>(
    () => ({
      setBudget: (budget: number) => dispatch({ type: 'setBudget', budget }),
      setTheme: (theme: ThemePreference) => dispatch({ type: 'setTheme', theme }),
      addProduct,
      updateProduct: (id: string, patch: Partial<Product>) =>
        dispatch({ type: 'updateProduct', id, patch }),
      deleteProduct: (id: string) => dispatch({ type: 'deleteProduct', id }),
      setPurchased: (id: string, purchased: boolean, actualPrice?: number | null) =>
        dispatch({ type: 'setPurchased', id, purchased, actualPrice }),
      addPriceRecord: (productId: string, draft: PriceRecordDraft) =>
        dispatch({ type: 'addPriceRecord', productId, draft }),
      deletePriceRecord: (productId: string, recordId: string) =>
        dispatch({ type: 'deletePriceRecord', productId, recordId }),
      replaceData: (data: AppData) => dispatch({ type: 'replaceData', data }),
      resetToSeed: () => dispatch({ type: 'resetToSeed' }),
    }),
    [addProduct],
  )

  const value = useMemo<PlannerContextValue>(
    () => ({ state, actions, storageName: persistence.name, storageError }),
    [state, actions, persistence.name, storageError],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}
