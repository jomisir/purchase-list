import { useEffect, useState } from 'react'
import type { Product } from '@/types'
import { formatMoney, parsePrice } from '@/lib/money'
import { lineEstimate } from '@/lib/calc'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { CurrencySelect } from '@/components/CurrencySelect'

/** Asks what was actually paid when an item is checked off the list. */
export function PurchaseDialog({
  product,
  open,
  onClose,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
}) {
  const { actions } = usePlanner()
  const toast = useToast()
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !product) return
    setPrice(
      product.actualPrice != null
        ? String(product.actualPrice)
        : product.currentPrice != null
          ? String(product.currentPrice)
          : String(product.estimatedPrice),
    )
    setStore(product.store ?? '')
    setError(null)
  }, [open, product])

  if (!product) return null

  function confirm(event?: React.FormEvent) {
    event?.preventDefault()
    if (!product) return
    const parsed = parsePrice(price)
    if (parsed === null) return setError('Enter what you paid, or skip for now.')
    if (Number.isNaN(parsed)) return setError('That price is not a number.')
    if (parsed < 0) return setError('A price cannot be negative.')
    if (parsed > 10_000_000) return setError('That price is unrealistically large.')

    if (store.trim() && store.trim() !== product.store) {
      actions.updateProduct(product.id, { store: store.trim() })
    }
    actions.setPurchased(product.id, true, parsed)
    const diff = parsed * product.quantity - lineEstimate(product)
    toast.success(
      diff === 0
        ? `${product.name} marked as bought.`
        : diff < 0
          ? `Bought — ${formatMoney(Math.abs(diff), product.currency)} under estimate.`
          : `Bought — ${formatMoney(diff, product.currency)} above estimate.`,
    )
    onClose()
  }

  function skip() {
    if (!product) return
    actions.setPurchased(product.id, true, null)
    toast.info('Marked as bought. Add the price any time.')
    onClose()
  }

  const parsed = parsePrice(price)
  const lineTotal =
    typeof parsed === 'number' && Number.isFinite(parsed) && product.quantity > 1
      ? `${product.quantity} × ${formatMoney(parsed, product.currency)} = ${formatMoney(parsed * product.quantity, product.currency)}`
      : undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="What did you pay?"
      description={product.name}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" form="purchase-form" size="lg" className="flex-1">
            Save purchase
          </Button>
          <Button variant="secondary" size="lg" onClick={skip} className="flex-1">
            Skip for now
          </Button>
        </div>
      }
    >
      <form id="purchase-form" onSubmit={confirm} noValidate className="space-y-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
        <TextField
          label="Price paid (per unit)"
          required
          autoFocus
          inputMode="decimal"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value)
            setError(null)
          }}
          error={error}
          hint={lineTotal ?? `Estimated ${formatMoney(lineEstimate(product), product.currency)} for this line.`}
        />
          </div>
          <div className="shrink-0 pt-[26px]">
            <CurrencySelect
              label="Currency paid in"
              value={product.currency}
              onChange={(code) => actions.updateProduct(product.id, { currency: code })}
              className="w-28"
            />
          </div>
        </div>
        <TextField
          label="Store"
          value={store}
          onChange={(event) => setStore(event.target.value)}
          placeholder="Where did you buy it?"
          autoComplete="off"
        />
      </form>
    </Modal>
  )
}
