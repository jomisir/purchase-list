import { useState } from 'react'
import type { Product } from '@/types'
import {
  lineEstimate,
  priceDifference,
  priceStats,
  targetDifference,
} from '@/lib/calc'
import { formatMoney } from '@/lib/money'
import { formatLongDate, formatRelativeDay } from '@/lib/date'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductImage } from '@/components/ProductImage'
import { DealBadge } from '@/components/DealBadge'
import { PriceHistoryPanel } from '@/components/PriceHistoryPanel'
import { IconEdit, IconExternal, IconTag, IconTrash } from '@/components/icons'

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className={cx('tnum text-[14px] font-semibold text-ink', tone)}>{value}</dd>
    </div>
  )
}

export function ProductDetailSheet({
  product,
  open,
  onClose,
  onEdit,
  onLogPrice,
}: {
  product: Product | null
  open: boolean
  onClose: () => void
  onEdit: (product: Product) => void
  onLogPrice: (product: Product) => void
}) {
  const { actions } = usePlanner()
  const toast = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!product) return null

  const stats = priceStats(product.priceHistory)
  const difference = priceDifference(product)
  const vsTarget = targetDifference(product)
  const canDelete = !product.purchased
  const targetRange =
    product.targetMin != null && product.targetMax != null
      ? `${formatMoney(product.targetMin)} – ${formatMoney(product.targetMax)}`
      : null

  function handleDelete() {
    if (!product) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    actions.deleteProduct(product.id)
    toast.success(`${product.name} removed from your plan.`)
    setConfirmingDelete(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmingDelete(false)
        onClose()
      }}
      title={product.name}
      description={`${product.category}${product.brand ? ` · ${product.brand}` : ''}`}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="flex-1" onClick={() => onLogPrice(product)}>
            <IconTag className="size-4" />
            Log price
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onEdit(product)}>
            <IconEdit className="size-4" />
            Edit
          </Button>
          {canDelete ? (
            <Button size="lg" variant={confirmingDelete ? 'danger' : 'ghost'} onClick={handleDelete}>
              <IconTrash className="size-4" />
              {confirmingDelete ? 'Tap again to confirm' : product.isCustom ? 'Delete' : 'Remove'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <ProductImage
            image={product.image}
            name={product.name}
            category={product.category}
            showFidelityNote
            noteSize="full"
            className="aspect-[4/3] w-full rounded-2xl border border-image-panel-line sm:aspect-square sm:w-44"
            imageClassName="p-3"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <DealBadge product={product} />
              {product.purchased ? <Badge tone="positive">PURCHASED</Badge> : null}
              {product.isCustom ? <Badge tone="brand">CUSTOM</Badge> : null}
              {product.quantity > 1 ? (
                <Badge tone="neutral">QTY {product.quantity}</Badge>
              ) : null}
            </div>

            <dl>
              <Row
                label={product.quantity > 1 ? 'Estimated (per unit)' : 'Estimated price'}
                value={formatMoney(product.estimatedPrice)}
              />
              {product.quantity > 1 ? (
                <Row label="Estimated line total" value={formatMoney(lineEstimate(product))} />
              ) : null}
              <Row
                label="Target price"
                value={product.targetPrice == null ? 'Not set' : formatMoney(product.targetPrice)}
              />
              {targetRange ? <Row label="Target range" value={targetRange} /> : null}
              <Row
                label="Current price"
                value={product.currentPrice == null ? 'Not checked yet' : formatMoney(product.currentPrice)}
                tone={product.currentPrice == null ? 'text-ink-muted' : 'text-brand'}
              />
              {vsTarget != null ? (
                <Row
                  label="Versus target"
                  value={
                    vsTarget === 0
                      ? 'Exactly on target'
                      : `${formatMoney(Math.abs(vsTarget))} ${vsTarget < 0 ? 'under' : 'over'}`
                  }
                  tone={vsTarget <= 0 ? 'text-positive' : 'text-negative'}
                />
              ) : null}
              {product.purchased ? (
                <Row
                  label="Price paid"
                  value={product.actualPrice == null ? 'Not recorded' : formatMoney(product.actualPrice)}
                  tone="text-positive"
                />
              ) : null}
              {difference ? (
                <Row
                  label="Versus estimate"
                  value={
                    difference.direction === 'equal'
                      ? 'Exactly on estimate'
                      : `${formatMoney(Math.abs(difference.amount))} ${difference.direction === 'saved' ? 'saved' : 'over'}`
                  }
                  tone={difference.direction === 'over' ? 'text-negative' : 'text-positive'}
                />
              ) : null}
              {stats.lowest != null ? (
                <Row label="Lowest recorded" value={formatMoney(stats.lowest)} tone="text-positive" />
              ) : null}
              {stats.highest != null ? (
                <Row label="Highest recorded" value={formatMoney(stats.highest)} />
              ) : null}
              <Row label="Store" value={product.store ?? 'Not set'} />
              <Row
                label="Price last checked"
                value={
                  stats.latestRecord ? formatRelativeDay(stats.latestRecord.date) : 'Never checked'
                }
              />
              <Row label="Last edited" value={formatRelativeDay(product.lastUpdated)} />
              <Row label="Added" value={formatLongDate(product.dateAdded)} />
            </dl>

            {product.productUrl ? (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
              >
                <IconExternal className="size-4" />
                View product page
              </a>
            ) : null}
          </div>
        </div>

        {product.notes ? (
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Notes</h3>
            <ul className="space-y-1.5 rounded-2xl bg-surface-muted p-3.5">
              {product.notes.split('\n').filter(Boolean).map((line, index) => (
                <li key={index} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-soft">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Price history</h3>
          <PriceHistoryPanel
            product={product}
            onLogPrice={() => onLogPrice(product)}
            onDeleteRecord={(recordId) => {
              actions.deletePriceRecord(product.id, recordId)
              toast.info('Price entry removed.')
            }}
          />
        </section>

        {!canDelete ? (
          <p className="rounded-xl bg-surface-muted px-3.5 py-2.5 text-[12.5px] text-ink-muted">
            Purchased items are kept in your plan so your spending stays accurate. Uncheck it first
            if you really want to remove it.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
