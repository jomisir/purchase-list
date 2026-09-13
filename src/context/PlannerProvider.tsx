import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData, Currency, ExchangeRates, Product, ThemePreference } from '@/types'
import { createPersistence } from '@/lib/storage'
import { applyFetch, fetchRates, isStale, RateError } from '@/lib/rates'
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

  const currency = state.settings.currency
  const rates = state.settings.rates
  const autoRefresh = state.settings.autoRefreshRates
  const refreshing = useRef(false)

  /** Fetches rates for the current home currency, keeping manual overrides. */
  const refreshRates = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (refreshing.current) return { ok: false, message: 'A refresh is already running.' }
    refreshing.current = true
    try {
      const result = await fetchRates(currency)
      dispatch({ type: 'setRates', rates: applyFetch(rates, result, currency) })
      return { ok: true, message: `Rates updated from ${result.provider}.` }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof RateError
            ? error.message
            : 'Could not fetch exchange rates just now.',
      }
    } finally {
      refreshing.current = false
    }
  }, [currency, rates])

  // Top rates up in the background once the app is running, so the first screen
  // is never waiting on the network. Failures are silent — the stored rates,
  // and the date stamp beside them, stay exactly as they were.
  useEffect(() => {
    if (!state.hydrated || !autoRefresh) return
    if (!isStale(rates)) return
    // navigator.onLine is unreliable for "is the internet reachable", but a
    // definite false is worth trusting: skip the request rather than log a
    // failed fetch the user can do nothing about.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      void refreshRates()
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state.hydrated, autoRefresh, rates, refreshRates])

  const addProduct = useCallback((draft: ProductDraft) => {
    const id = createId('product')
    dispatch({ type: 'addProduct', draft, id })
    return id
  }, [])

  const actions = useMemo<PlannerActions>(
    () => ({
      setBudget: (budget: number) => dispatch({ type: 'setBudget', budget }),
      setTheme: (theme: ThemePreference) => dispatch({ type: 'setTheme', theme }),
      setCurrency: (next: Currency, convertAmounts: boolean) =>
        dispatch({ type: 'setCurrency', currency: next, convertAmounts }),
      setRates: (next: ExchangeRates) => dispatch({ type: 'setRates', rates: next }),
      setRateOverride: (code: Currency, rate: number | null) =>
        dispatch({ type: 'setRateOverride', code, rate }),
      setAutoRefreshRates: (enabled: boolean) =>
        dispatch({ type: 'setAutoRefreshRates', enabled }),
      setAlertThreshold: (threshold: number) =>
        dispatch({ type: 'setAlertThreshold', threshold }),
      refreshRates,
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
    [addProduct, refreshRates],
  )

  const value = useMemo<PlannerContextValue>(
    () => ({ state, actions, storageName: persistence.name, storageError }),
    [state, actions, persistence.name, storageError],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}
