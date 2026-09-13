import type { Product } from '@/types'
import { useLists, usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { ProductForm } from '@/components/ProductForm'

export function EditProductDialog({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  const { actions } = usePlanner()
  const { lists } = useLists()
  const toast = useToast()
  if (!product) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit product" description={product.name} size="lg">
      <ProductForm
        key={product.id}
        product={product}
        submitLabel="Save changes"
        onCancel={onClose}
        onSubmit={(draft, values) => {
          actions.updateProduct(product.id, {
            ...draft,
            // Keep the original provenance — editing never turns a planned item
            // into a custom one, or the other way round.
            isCustom: product.isCustom,
            purchasedAt: draft.purchased ? (product.purchasedAt ?? new Date().toISOString()) : null,
          })
          const target = lists.find((list) => list.id === values.listId)
          if (target && target.id !== product.listId) {
            actions.moveProduct(product.id, target.id)
            toast.success(`Moved to “${target.name}”.`)
          } else {
            toast.success('Product updated.')
          }
          onClose()
        }}
      />
    </Modal>
  )
}
