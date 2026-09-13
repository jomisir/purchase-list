import type { Product } from '@/types'
import { priceStats, sortHistory, storeComparison } from '@/lib/calc'
import { formatMoney } from '@/lib/money'
import { formatRelativeDay, formatShortDate } from '@/lib/date'
import { cx } from '@/lib/cx'
import { Sparkline } from '@/components/ui/Sparkline'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { IconExternal, IconTag, IconTrash } from '@/components/icons'

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <p className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </p>
      <p className={cx('tnum mt-0.5 text-[14px] font-semibold', tone ?? 'text-ink')}>{value}</p>
    </div>
  )
}

/** Price history chart, per-store comparison and the raw log of observations. */
export function PriceHistoryPanel({
  product,
  onDeleteRecord,
  onLogPrice,
}: {
  product: Product
  onDeleteRecord?: (recordId: string) => void
  onLogPrice?: () => void
}) {
  const stats = priceStats(product.priceHistory)
  const history = sortHistory(product.priceHistory)
  const stores = storeComparison(product)

  if (history.length === 0) {
    return (
      <EmptyState
        compact
        icon={<IconTag className="size-5" />}
        title="No price history yet"
        description="Log the price the first time you see this item in a store. Every price you record is kept here."
        action={
          onLogPrice ? (
            <button
              type="button"
              onClick={onLogPrice}
              className="rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand"
            >
              Log the first price
            </button>
          ) : null
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Lowest" value={formatMoney(stats.lowest)} tone="text-positive" />
        <Stat label="Highest" value={formatMoney(stats.highest)} tone="text-negative" />
        <Stat label="Average" value={formatMoney(stats.average)} />
        <Stat label="Latest" value={formatMoney(stats.latest)} tone="text-brand" />
      </div>

      {history.length > 1 ? (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="mb-1 flex items-center justify-between text-[11.5px] text-ink-muted">
            <span>{formatShortDate(history[0].date)}</span>
            {product.targetPrice != null ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-gold" />
                Target {formatMoney(product.targetPrice)}
              </span>
            ) : null}
            <span>{formatShortDate(history[history.length - 1].date)}</span>
          </div>
          <Sparkline records={history} target={product.targetPrice} height={96} />
        </div>
      ) : null}

      {stores.length > 0 ? (
        <div>
          <h4 className="mb-2 text-[13px] font-semibold text-ink-soft">Store comparison</h4>
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Best recorded price at each store</caption>
              <thead className="bg-surface-muted text-[11px] tracking-[0.05em] text-ink-muted uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Store</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Best price</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Seen</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((quote, index) => (
                  <tr
                    key={quote.recordId}
                    className={cx(
                      'border-t border-line',
                      index === 0 && stores.length > 1 && 'bg-positive-soft',
                    )}
                  >
                    <th scope="row" className="px-3 py-2.5 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        <span className="truncate">{quote.store}</span>
                        {index === 0 && stores.length > 1 ? (
                          <Badge tone="positive">LOWEST</Badge>
                        ) : null}
                        {quote.url ? (
                          <a
                            href={quote.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-brand"
                            aria-label={`Open link for ${quote.store}`}
                          >
                            <IconExternal className="size-3.5" />
                          </a>
                        ) : null}
                      </span>
                    </th>
                    <td className="tnum px-3 py-2.5 text-right font-semibold text-ink">
                      {formatMoney(quote.price)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-ink-muted">
                      {formatShortDate(quote.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-ink-soft">
          Every price logged ({history.length})
        </h4>
        <ul className="space-y-1.5">
          {[...history].reverse().map((record) => (
            <li
              key={record.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
            >
              <span className="tnum w-12 shrink-0 text-[12px] font-semibold text-ink-muted">
                {formatShortDate(record.date)}
              </span>
              <span
                className={cx(
                  'tnum w-24 shrink-0 text-[14px] font-semibold',
                  record.price === stats.lowest ? 'text-positive' : 'text-ink',
                )}
              >
                {formatMoney(record.price)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-muted">
                {record.store ?? 'Unspecified store'}
                {record.notes ? ` · ${record.notes}` : ''}
                {record.source === 'purchase' ? ' · paid' : ''}
              </span>
              <span className="hidden shrink-0 text-[11.5px] text-ink-faint sm:inline">
                {formatRelativeDay(record.date)}
              </span>
              {onDeleteRecord ? (
                <button
                  type="button"
                  onClick={() => onDeleteRecord(record.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-negative-soft hover:text-negative"
                  aria-label={`Delete the ${formatMoney(record.price)} price from ${formatShortDate(record.date)}`}
                >
                  <IconTrash className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
