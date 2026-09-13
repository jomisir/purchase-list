import { useCallback, useMemo, useState } from 'react'
import type { Product } from '@/types'
import { usePlanner, useProducts } from '@/context/plannerContext'
import { ProductDetailSheet } from '@/components/ProductDetailSheet'
import { EditProductDialog } from '@/components/EditProductDialog'
import { PriceLogDialog } from '@/components/PriceLogDialog'
import { PurchaseDialog } from '@/components/PurchaseDialog'

/**
 * One place to own the product dialogs so every screen behaves the same.
 * Only ids are held in state — the product itself is always read fresh from
 * the store, so an open sheet updates as soon as anything changes.
 */
export function useProductDialogs() {
  const products = useProducts()
  const { actions } = usePlanner()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [priceId, setPriceId] = useState<string | null>(null)
  const [purchaseId, setPurchaseId] = useState<string | null>(null)

  const find = useCallback(
    (id: string | null) => (id ? (products.find((item) => item.id === id) ?? null) : null),
    [products],
  )

  const openDetails = useCallback((product: Product) => setDetailId(product.id), [])
  const openEdit = useCallback((product: Product) => setEditId(product.id), [])
  const openLogPrice = useCallback((product: Product) => setPriceId(product.id), [])

  const togglePurchased = useCallback(
    (product: Product, next: boolean) => {
      if (next) setPurchaseId(product.id)
      else actions.setPurchased(product.id, false)
    },
    [actions],
  )

  const dialogs = useMemo(
    () => (
      <>
        <ProductDetailSheet
          product={find(detailId)}
          open={detailId !== null}
          onClose={() => setDetailId(null)}
          onEdit={(product) => {
            setDetailId(null)
            setEditId(product.id)
          }}
          onLogPrice={(product) => {
            setDetailId(null)
            setPriceId(product.id)
          }}
        />
        <EditProductDialog
          product={find(editId)}
          open={editId !== null}
          onClose={() => setEditId(null)}
        />
        <PriceLogDialog
          product={find(priceId)}
          open={priceId !== null}
          onClose={() => setPriceId(null)}
        />
        <PurchaseDialog
          product={find(purchaseId)}
          open={purchaseId !== null}
          onClose={() => setPurchaseId(null)}
        />
      </>
    ),
    [detailId, editId, priceId, purchaseId, find],
  )

  return { dialogs, openDetails, openEdit, openLogPrice, togglePurchased }
}
