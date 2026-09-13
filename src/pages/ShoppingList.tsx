import { useState } from 'react'
import { formatMoney, formatPercent } from '@/lib/money'
import { useProducts, useTotals } from '@/context/plannerContext'
import { useProductDialogs } from '@/hooks/useProductDialogs'
import {
  DEFAULT_FILTERS,
  FilterBar,
  useFilteredProducts,
  type ListFilters,
} from '@/components/FilterBar'
import { ProductCard } from '@/components/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { IconCart, IconPlus, IconSearch } from '@/components/icons'

export function ShoppingList() {
  const products = useProducts()
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS)
  const visible = useFilteredProducts(products, filters)
  const { dialogs, openDetails, openEdit, openLogPrice, togglePurchased } = useProductDialogs()
  const totals = useTotals()

  const filtered = filters.query !== '' || filters.status !== 'all' || filters.category !== 'all'

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">
            Shopping List
          </h1>
          <p className="tnum mt-1 text-[13px] text-ink-muted">
            {totals.purchasedCount} of {totals.totalCount} bought ·{' '}
            {formatMoney(totals.actualTotal, totals.currency)} spent
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink to="/shopping" size="sm" variant="contrast">
            <IconCart className="size-4" />
            Shopping Mode
          </ButtonLink>
          <ButtonLink to="/add" size="sm" variant="secondary">
            <IconPlus className="size-4" />
            Add
          </ButtonLink>
        </div>
      </header>

      <ProgressBar
        value={totals.completion}
        tone="brand"
        label={`${formatPercent(totals.completion)} of items bought`}
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        products={products}
        resultCount={visible.length}
      />

      {visible.length === 0 ? (
        products.length === 0 ? (
          <EmptyState
            icon={<IconCart className="size-6" />}
            title="Nothing on your list yet"
            description="Add your first product to start planning."
            action={
              <ButtonLink to="/add">
                <IconPlus className="size-4" />
                Add a product
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            icon={<IconSearch className="size-6" />}
            title={filters.query ? `No matches for “${filters.query}”` : 'Nothing matches these filters'}
            description={
              filters.status === 'bought'
                ? 'You have not checked anything off yet. Tick a product once you have bought it.'
                : filters.status === 'deals'
                  ? 'No logged price is below its target yet. Log prices as you find them.'
                  : filters.status === 'overTarget'
                    ? 'Nothing you have priced is above its target — good news.'
                    : 'Try a different search or clear the filters.'
            }
            action={
              filtered ? (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand"
                >
                  Clear filters
                </button>
              ) : null
            }
          />
        )
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onTogglePurchased={togglePurchased}
              onOpenDetails={openDetails}
              onEdit={openEdit}
              onLogPrice={openLogPrice}
            />
          ))}
        </div>
      )}

      {dialogs}
    </div>
  )
}
