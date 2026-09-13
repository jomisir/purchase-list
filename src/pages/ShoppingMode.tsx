import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Category, Product } from '@/types'
import { CATEGORIES } from '@/types'
import { matchesSearch, priceStats } from '@/lib/calc'
import { formatMoney, formatPercent } from '@/lib/money'
import { cx } from '@/lib/cx'
import { useActiveList, useLists, useProducts, useTotals } from '@/context/plannerContext'
import { useProductDialogs } from '@/hooks/useProductDialogs'
import { ProductImage } from '@/components/ProductImage'
import { PurchaseCheckbox } from '@/components/PurchaseCheckbox'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconArrowLeft, IconCheck, IconClose, IconSearch, IconStore, IconTag } from '@/components/icons'

/**
 * A stripped-back view for use inside a shop: big targets, big checkboxes,
 * no analytics. Everything else stays on the other screens.
 */
function ShoppingRow({
  product,
  onToggle,
  onLogPrice,
}: {
  product: Product
  onToggle: (product: Product, next: boolean) => void
  onLogPrice: (product: Product) => void
}) {
  const [showNotes, setShowNotes] = useState(false)
  const stats = priceStats(product.priceHistory)
  const best = stats.lowestRecord
  const notes = product.notes?.split('\n').filter(Boolean) ?? []

  return (
    <li
      className={cx(
        'overflow-hidden rounded-card border bg-surface shadow-card transition',
        product.purchased ? 'border-positive/40 opacity-70' : 'border-line',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <ProductImage
          image={product.image}
          name={product.name}
          category={product.category}
          className="size-16 shrink-0 rounded-xl border border-image-panel-line"
          imageClassName="p-1"
        />

        <div className="min-w-0 flex-1">
          <h2
            className={cx(
              'text-[16px] leading-snug font-semibold text-ink',
              product.purchased && 'line-through decoration-ink-faint/70',
            )}
          >
            {product.name}
            {product.quantity > 1 ? (
              <span className="tnum ml-1.5 text-[13px] font-medium text-ink-muted">
                ×{product.quantity}
              </span>
            ) : null}
          </h2>

          <p className="tnum mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13.5px]">
            <span className="font-semibold text-ink-soft">
              Target {formatMoney(product.targetPrice ?? product.estimatedPrice, product.currency)}
            </span>
            {best ? (
              <span className="font-semibold text-positive">
                Best {formatMoney(best.price, best.currency)}
              </span>
            ) : (
              <span className="text-ink-faint">No price logged</span>
            )}
          </p>

          {best?.store || product.store ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-ink-muted">
              <IconStore className="size-3.5 shrink-0" />
              {best?.store ?? product.store}
            </p>
          ) : null}
        </div>

        <PurchaseCheckbox
          size="lg"
          checked={product.purchased}
          onChange={(next) => onToggle(product, next)}
          label={`Mark ${product.name} as purchased`}
        />
      </div>

      <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        <button
          type="button"
          onClick={() => onLogPrice(product)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-brand transition hover:bg-brand-soft"
        >
          <IconTag className="size-4.5" />
          Log price
        </button>
        {notes.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowNotes((open) => !open)}
            aria-expanded={showNotes}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-ink-soft transition hover:bg-surface-muted"
          >
            {showNotes ? 'Hide notes' : `Notes (${notes.length})`}
          </button>
        ) : null}
      </div>

      {showNotes && notes.length > 0 ? (
        <ul className="space-y-1.5 border-t border-line bg-surface-muted px-4 py-3">
          {notes.map((line, index) => (
            <li key={index} className="flex gap-2 text-[14px] leading-relaxed text-ink-soft">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function ShoppingMode() {
  const products = useProducts()
  const activeList = useActiveList()
  const { lists } = useLists()
  const { dialogs, openLogPrice, togglePurchased } = useProductDialogs()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [hideBought, setHideBought] = useState(true)

  const totals = useTotals()

  const visible = useMemo(
    () =>
      products.filter(
        (product) =>
          matchesSearch(product, query) &&
          (category === 'all' || product.category === category) &&
          (!hideBought || !product.purchased),
      ),
    [products, query, category, hideBought],
  )

  const usedCategories = useMemo(
    () => CATEGORIES.filter((entry) => products.some((p) => p.category === entry)),
    [products],
  )

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-md pt-safe px-inset">
        <div className="mx-auto w-full max-w-3xl px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-2">
            <Link
              to="/list"
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink-soft transition hover:bg-surface-muted"
            >
              <IconArrowLeft className="size-5" />
              Exit
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-[14px] font-semibold tracking-tight text-ink">Shopping Mode</h1>
              <p className="tnum truncate text-[12px] text-ink-muted">
                {lists.length > 1 && activeList ? `${activeList.name} · ` : ''}
                {totals.purchasedCount}/{totals.totalCount} bought
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideBought((value) => !value)}
              aria-pressed={hideBought}
              className={cx(
                'inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition',
                hideBought ? 'bg-brand-soft text-brand-ink' : 'text-ink-soft hover:bg-surface-muted',
              )}
            >
              <IconCheck className="size-4" />
              {hideBought ? 'Hiding bought' : 'Showing all'}
            </button>
          </div>

          <ProgressBar
            className="mt-2"
            value={totals.completion}
            tone="brand"
            label={`${formatPercent(totals.completion)} of items bought`}
          />

          <div className="mt-2.5 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find an item"
                aria-label="Search your shopping list"
                className="h-12 w-full rounded-full border border-line bg-surface pr-10 pl-11 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted"
                >
                  <IconClose className="size-4" />
                </button>
              ) : null}
            </div>
            <label className="shrink-0">
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category | 'all')}
                className="h-12 max-w-36 rounded-full border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink-soft focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
              >
                <option value="all">All</option>
                {usedCategories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-gutter-tight pt-3 pb-28">
        {visible.length === 0 ? (
          <EmptyState
            icon={hideBought ? <IconCheck className="size-6" /> : <IconSearch className="size-6" />}
            title={
              query
                ? `No matches for “${query}”`
                : hideBought && totals.purchasedCount === totals.totalCount
                  ? 'Everything is bought'
                  : 'Nothing left in this filter'
            }
            description={
              hideBought && totals.purchasedCount === totals.totalCount
                ? 'Your whole plan is checked off. Enjoy the rest of the trip.'
                : 'Switch category, clear the search, or show bought items too.'
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((product) => (
              <ShoppingRow
                key={product.id}
                product={product}
                onToggle={togglePurchased}
                onLogPrice={openLogPrice}
              />
            ))}
          </ul>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md pb-safe px-inset">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
              Spent
            </p>
            <p className="tnum text-[17px] font-semibold text-ink">
              {formatMoney(totals.actualTotal, totals.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
              Remaining
            </p>
            <p
              className={cx(
                'tnum text-[17px] font-semibold',
                totals.remaining < 0 ? 'text-negative' : 'text-positive',
              )}
            >
              {totals.remaining < 0
                ? `${formatMoney(Math.abs(totals.remaining), totals.currency)} over`
                : formatMoney(totals.remaining, totals.currency)}
            </p>
          </div>
        </div>
      </footer>

      {dialogs}
    </div>
  )
}
