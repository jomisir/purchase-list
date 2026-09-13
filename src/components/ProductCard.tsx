import type { Product } from '@/types'
import {
  lineEstimate,
  priceDifference,
  priceStats,
  targetDifference,
} from '@/lib/calc'
import { formatMoney } from '@/lib/money'
import { cx } from '@/lib/cx'
import { ProductImage } from '@/components/ProductImage'
import { DealBadge } from '@/components/DealBadge'
import { PurchaseCheckbox } from '@/components/PurchaseCheckbox'
import { Badge } from '@/components/ui/Badge'
import { Sparkline } from '@/components/ui/Sparkline'
import {
  IconChevronRight,
  IconClipboard,
  IconEdit,
  IconExternal,
  IconStore,
  IconTag,
} from '@/components/icons'

function PriceColumn({
  label,
  value,
  tone = 'default',
  sub,
}: {
  label: string
  value: string
  tone?: 'default' | 'brand' | 'muted' | 'positive'
  sub?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd
        className={cx(
          'tnum mt-0.5 text-[15px] leading-tight font-semibold',
          tone === 'brand' && 'text-brand',
          tone === 'muted' && 'text-ink-muted',
          tone === 'positive' && 'text-positive',
          tone === 'default' && 'text-ink',
        )}
      >
        {value}
      </dd>
      {sub ? <dd className="tnum mt-0.5 text-[11.5px] text-ink-muted">{sub}</dd> : null}
    </div>
  )
}

export function ProductCard({
  product,
  onTogglePurchased,
  onOpenDetails,
  onEdit,
  onLogPrice,
}: {
  product: Product
  onTogglePurchased: (product: Product, next: boolean) => void
  onOpenDetails: (product: Product) => void
  onEdit: (product: Product) => void
  onLogPrice: (product: Product) => void
}) {
  const stats = priceStats(product.priceHistory)
  const difference = priceDifference(product)
  const vsTarget = targetDifference(product)
  const multi = product.quantity > 1
  const notesPreview = product.notes?.split('\n').filter(Boolean).slice(0, 2).join(' · ')

  return (
    <article
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-card border bg-surface shadow-card transition',
        'hover:-translate-y-px hover:shadow-pop focus-within:shadow-pop',
        product.purchased ? 'border-positive/35' : 'border-line',
      )}
    >
      {product.purchased ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-positive" />
      ) : null}

      <div className="flex gap-3.5 p-3.5 sm:gap-4 sm:p-4">
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className="shrink-0 self-start rounded-2xl focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={`Open details for ${product.name}`}
        >
          <ProductImage
            image={product.image}
            name={product.name}
            category={product.category}
            showFidelityNote
            className={cx(
              'size-18 rounded-2xl border border-image-panel-line min-[360px]:size-22 sm:size-26',
              product.purchased && 'opacity-70',
            )}
            imageClassName="p-1.5"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onOpenDetails(product)}
              className="min-w-0 flex-1 text-left"
            >
              <h3
                className={cx(
                  'text-[15px] leading-snug font-semibold text-balance text-ink',
                  product.purchased && 'text-ink-soft line-through decoration-ink-faint/70',
                )}
              >
                {product.name}
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
                <span>{product.category}</span>
                {product.brand ? <span aria-hidden="true">·</span> : null}
                {product.brand ? <span>{product.brand}</span> : null}
                {multi ? <span aria-hidden="true">·</span> : null}
                {multi ? <span className="tnum font-semibold">Qty {product.quantity}</span> : null}
                {product.isCustom ? (
                  <span className="rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-semibold text-brand-ink">
                    Custom
                  </span>
                ) : null}
              </p>
            </button>

            <PurchaseCheckbox
              checked={product.purchased}
              onChange={(next) => onTogglePurchased(product, next)}
              label={`Mark ${product.name} as purchased`}
            />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            <PriceColumn
              label={product.targetPrice != null ? 'Target' : 'Estimated'}
              value={formatMoney(product.targetPrice ?? product.estimatedPrice, product.currency)}
              tone="muted"
              sub={multi ? `${formatMoney(lineEstimate(product), product.currency)} for ${product.quantity}` : undefined}
            />
            {product.purchased ? (
              <PriceColumn
                label="Paid"
                value={formatMoney(product.actualPrice, product.currency)}
                tone="positive"
                sub={
                  multi && product.actualPrice != null
                    ? `${formatMoney(product.actualPrice * product.quantity, product.currency)} total`
                    : undefined
                }
              />
            ) : (
              <PriceColumn
                label="Current"
                value={product.currentPrice == null ? 'Not checked' : formatMoney(product.currentPrice, product.currency)}
                tone={product.currentPrice == null ? 'muted' : 'brand'}
                sub={
                  vsTarget != null
                    ? vsTarget === 0
                      ? 'Exactly on target'
                      : `${formatMoney(Math.abs(vsTarget), product.currency)} ${vsTarget < 0 ? 'under' : 'over'} target`
                    : undefined
                }
              />
            )}
            {stats.lowest != null ? (
              <PriceColumn
                label="Lowest seen"
                value={formatMoney(stats.lowest, product.currency)}
                tone="muted"
                sub={stats.lowestRecord?.store}
              />
            ) : null}
          </dl>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <DealBadge product={product} />
            {product.purchased && difference ? (
              <Badge tone={difference.direction === 'saved' ? 'positive' : difference.direction === 'over' ? 'caution' : 'neutral'}>
                {difference.direction === 'equal'
                  ? 'ON ESTIMATE'
                  : `${formatMoney(Math.abs(difference.amount), product.currency)} ${difference.direction === 'saved' ? 'SAVED' : 'OVER'}`}
              </Badge>
            ) : null}
            {product.purchased ? <Badge tone="positive">PURCHASED</Badge> : null}
            {!product.purchased && product.currentPrice == null ? (
              <Badge tone="neutral">NO PRICE LOGGED</Badge>
            ) : null}
          </div>
        </div>
      </div>

      {(notesPreview || product.store || stats.count > 0) && (
        <div className="mx-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 pb-1 text-[12px] text-ink-muted sm:mx-4">
          {product.store ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <IconStore className="size-3.5 shrink-0" />
              <span className="truncate">{product.store}</span>
            </span>
          ) : null}
          {stats.count > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <IconTag className="size-3.5 shrink-0" />
              <span className="tnum">
                {stats.count} price{stats.count === 1 ? '' : 's'} logged
              </span>
            </span>
          ) : null}
          {notesPreview ? (
            <span className="inline-flex min-w-0 basis-full items-center gap-1.5">
              <IconClipboard className="size-3.5 shrink-0" />
              <span className="truncate">{notesPreview}</span>
            </span>
          ) : null}
        </div>
      )}

      {stats.count > 1 ? (
        <div className="px-2 pt-1">
          <Sparkline records={product.priceHistory} target={product.targetPrice} height={54} />
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          type="button"
          onClick={() => onLogPrice(product)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-brand transition hover:bg-brand-soft"
        >
          <IconTag className="size-4" />
          Log price
        </button>
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-soft transition hover:bg-surface-muted"
        >
          <IconEdit className="size-4" />
          Edit
        </button>
        {product.productUrl ? (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-soft transition hover:bg-surface-muted"
          >
            <IconExternal className="size-4" />
            <span className="sr-only sm:not-sr-only">Link</span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className="ml-auto inline-flex h-9 items-center gap-0.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-soft transition hover:bg-surface-muted"
        >
          Details
          <IconChevronRight className="size-4" />
        </button>
      </div>
    </article>
  )
}
