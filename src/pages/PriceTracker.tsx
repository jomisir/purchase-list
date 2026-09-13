import { useMemo, useState } from 'react'
import type { Product } from '@/types'
import { dealStatus, priceStats, storeComparison, targetDifference } from '@/lib/calc'
import { formatMoney } from '@/lib/money'
import { formatRelativeDay } from '@/lib/date'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { useProductDialogs } from '@/hooks/useProductDialogs'
import {
  DEFAULT_FILTERS,
  FilterBar,
  useFilteredProducts,
  type ListFilters,
} from '@/components/FilterBar'
import { ProductImage } from '@/components/ProductImage'
import { DealBadge } from '@/components/DealBadge'
import { Sparkline } from '@/components/ui/Sparkline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconExternal, IconSearch, IconStore, IconTag } from '@/components/icons'

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className={cx('tnum mt-0.5 text-[14px] font-semibold', tone ?? 'text-ink')}>{value}</dd>
    </div>
  )
}

function TrackerRow({
  product,
  onLogPrice,
  onOpenDetails,
}: {
  product: Product
  onLogPrice: (product: Product) => void
  onOpenDetails: (product: Product) => void
}) {
  const stats = priceStats(product.priceHistory)
  const stores = storeComparison(product)
  const vsTarget = targetDifference(product)
  const deal = dealStatus(product)

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3.5 p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className="shrink-0 self-start rounded-2xl"
          aria-label={`Open details for ${product.name}`}
        >
          <ProductImage
            image={product.image}
            name={product.name}
            category={product.category}
            className="size-18 rounded-2xl border border-image-panel-line"
            imageClassName="p-1.5"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenDetails(product)}
              className="min-w-0 text-left"
            >
              <h3 className="truncate text-[15px] font-semibold text-ink">{product.name}</h3>
              <p className="text-[12px] text-ink-muted">
                {product.category}
                {product.quantity > 1 ? ` · Qty ${product.quantity}` : ''}
              </p>
            </button>
            <DealBadge product={product} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <Metric label="Target" value={formatMoney(product.targetPrice, product.currency)} />
            <Metric
              label="Current"
              value={product.currentPrice == null ? 'Not checked' : formatMoney(product.currentPrice, product.currency)}
              tone={
                product.currentPrice == null
                  ? 'text-ink-muted'
                  : deal === 'above'
                    ? 'text-negative'
                    : 'text-brand'
              }
            />
            <Metric
              label="Lowest"
              value={stats.lowest == null ? '—' : formatMoney(stats.lowest, product.currency)}
              tone={stats.lowest == null ? 'text-ink-muted' : 'text-positive'}
            />
            <Metric
              label="Highest"
              value={stats.highest == null ? '—' : formatMoney(stats.highest, product.currency)}
              tone="text-ink-soft"
            />
          </dl>

          <p className="tnum mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <IconStore className="size-3.5" />
              {product.store ?? 'No store noted'}
            </span>
            <span>
              Price checked{' '}
              {stats.latestRecord ? formatRelativeDay(stats.latestRecord.date) : 'never'}
            </span>
            {vsTarget != null ? (
              <span className={vsTarget <= 0 ? 'text-positive' : 'text-negative'}>
                {vsTarget === 0
                  ? 'On target'
                  : `${formatMoney(Math.abs(vsTarget), product.currency)} ${vsTarget < 0 ? 'under' : 'over'} target`}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {stats.count > 1 ? (
        <div className="px-2">
          <Sparkline records={product.priceHistory} target={product.targetPrice} height={64} />
        </div>
      ) : null}

      {stores.length > 1 ? (
        <div className="mx-3.5 mb-1 overflow-hidden rounded-xl border border-line sm:mx-4">
          <table className="w-full text-left text-[12.5px]">
            <caption className="sr-only">Store comparison for {product.name}</caption>
            <thead className="bg-surface-muted text-[10px] tracking-[0.05em] text-ink-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-semibold">Store</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {stores.slice(0, 4).map((quote, index) => (
                <tr
                  key={quote.recordId}
                  className={cx('border-t border-line', index === 0 && 'bg-positive-soft')}
                >
                  <th scope="row" className="truncate px-3 py-1.5 font-medium text-ink">
                    {quote.store}
                    {index === 0 ? (
                      <span className="ml-1.5 text-[10px] font-bold text-positive">LOWEST</span>
                    ) : null}
                  </th>
                  <td className="tnum px-3 py-1.5 text-right font-semibold text-ink">
                    {formatMoney(quote.price, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3.5 py-2.5 sm:px-4">
        <Button size="sm" onClick={() => onLogPrice(product)}>
          <IconTag className="size-4" />
          Update price
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onOpenDetails(product)}>
          History ({stats.count})
        </Button>
        {product.productUrl ? (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft transition hover:bg-surface-muted"
          >
            <IconExternal className="size-4" />
            View product
          </a>
        ) : null}
      </div>
    </Card>
  )
}

export function PriceTracker() {
  const { state } = usePlanner()
  const [filters, setFilters] = useState<ListFilters>({ ...DEFAULT_FILTERS, sort: 'bestVsTarget' })
  const visible = useFilteredProducts(state.products, filters)
  const { dialogs, openDetails, openLogPrice } = useProductDialogs()

  const summary = useMemo(() => {
    const tracked = state.products.filter((product) => product.priceHistory.length > 0)
    const records = state.products.reduce(
      (total, product) => total + product.priceHistory.length,
      0,
    )
    const deals = state.products.filter((product) => {
      const status = dealStatus(product)
      return status === 'good' || status === 'great'
    }).length
    return { tracked: tracked.length, records, deals }
  }, [state.products])

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">
          Price Tracker
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Prices are whatever you record — nothing is fetched live. Update a price each time you
          check a store.
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Products tracked', value: `${summary.tracked}/${state.products.length}` },
          { label: 'Prices logged', value: String(summary.records) },
          { label: 'Below target', value: String(summary.deals) },
        ].map((item) => (
          <Card key={item.label} className="px-3 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
              {item.label}
            </dt>
            <dd className="tnum mt-1 text-[19px] font-semibold text-ink">{item.value}</dd>
          </Card>
        ))}
      </dl>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        products={state.products}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconSearch className="size-6" />}
          title="Nothing to track here"
          description="Adjust the filters, or add a product to start tracking its price."
        />
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {visible.map((product) => (
            <TrackerRow
              key={product.id}
              product={product}
              onLogPrice={openLogPrice}
              onOpenDetails={openDetails}
            />
          ))}
        </div>
      )}

      {dialogs}
    </div>
  )
}
