import { useEffect, useState } from 'react'
import type { Product } from '@/types'
import { isoDate } from '@/lib/date'
import { formatMoney, parsePrice } from '@/lib/money'
import { validateUrl } from '@/lib/url'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'

/** Records one observed price for a product: store, date, optional link + note. */
export function PriceLogDialog({
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
  const [date, setDate] = useState(isoDate())
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !product) return
    setPrice(product.currentPrice == null ? '' : String(product.currentPrice))
    setStore(product.store ?? '')
    setDate(isoDate())
    setUrl(product.productUrl ?? '')
    setNotes('')
    setError(null)
    setUrlError(null)
  }, [open, product])

  if (!product) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!product) return
    const parsed = parsePrice(price)
    if (parsed === null) return setError('Enter the price you saw.')
    if (Number.isNaN(parsed)) return setError('That price is not a number.')
    if (parsed < 0) return setError('A price cannot be negative.')
    if (parsed > 10_000_000) return setError('That price is unrealistically large.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Choose a valid date.')

    const link = validateUrl(url)
    if (link.error) return setUrlError(link.error)

    actions.addPriceRecord(product.id, {
      price: parsed,
      store: store.trim() || undefined,
      date,
      url: link.value,
      notes: notes.trim() || undefined,
    })
    toast.success(`Logged ${formatMoney(parsed)} for ${product.name}`)
    onClose()
  }

  const target = product.targetPrice
  const parsedPreview = parsePrice(price)
  const preview =
    target != null && typeof parsedPreview === 'number' && Number.isFinite(parsedPreview)
      ? parsedPreview <= target * 0.9
        ? { tone: 'text-gold-ink', text: `Great deal — ${formatMoney(target - parsedPreview)} under your target` }
        : parsedPreview < target
          ? { tone: 'text-positive', text: `Good deal — ${formatMoney(target - parsedPreview)} under your target` }
          : parsedPreview > target
            ? { tone: 'text-negative', text: `${formatMoney(parsedPreview - target)} above your target` }
            : { tone: 'text-brand', text: 'Exactly on target' }
      : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a price"
      description={product.name}
      footer={
        <div className="flex gap-2">
          <Button type="submit" form="price-log-form" size="lg" fullWidth>
            Save price
          </Button>
        </div>
      }
    >
      <form id="price-log-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          label="Price you saw"
          required
          autoFocus
          inputMode="decimal"
          prefix="AED"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value)
            setError(null)
          }}
          error={error}
          hint={
            target != null ? `Your target is ${formatMoney(target)} per unit.` : undefined
          }
          placeholder="0"
        />

        {preview ? (
          <p className={`text-[13px] font-semibold ${preview.tone}`}>{preview.text}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Store"
            value={store}
            onChange={(event) => setStore(event.target.value)}
            placeholder="e.g. Sharaf DG"
            autoComplete="off"
          />
          <TextField
            label="Date seen"
            type="date"
            value={date}
            max={isoDate()}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <TextField
          label="Link"
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value)
            setUrlError(null)
          }}
          error={urlError}
          placeholder="Optional"
          autoComplete="off"
        />

        <TextAreaField
          label="Note"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. last one in stock, open box"
          rows={3}
        />
      </form>
    </Modal>
  )
}
