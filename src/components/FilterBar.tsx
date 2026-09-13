import { useMemo } from 'react'
import type { Category, Product, ProductStatusFilter, SortKey } from '@/types'
import { CATEGORIES } from '@/types'
import { SORT_LABELS, matchesSearch, matchesStatus, sortProducts } from '@/lib/calc'
import { cx } from '@/lib/cx'
import { IconClose, IconSearch, IconSort } from '@/components/icons'

export interface ListFilters {
  query: string
  status: ProductStatusFilter
  category: Category | 'all'
  sort: SortKey
}

export const DEFAULT_FILTERS: ListFilters = {
  query: '',
  status: 'all',
  category: 'all',
  sort: 'default',
}

const STATUS_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To buy' },
  { value: 'bought', label: 'Bought' },
  { value: 'deals', label: 'Deals' },
  { value: 'overTarget', label: 'Over target' },
]

/** Applies search, status, category and sorting in one pass. */
export function useFilteredProducts(products: Product[], filters: ListFilters): Product[] {
  return useMemo(() => {
    const filtered = products.filter(
      (product) =>
        matchesSearch(product, filters.query) &&
        matchesStatus(product, filters.status) &&
        (filters.category === 'all' || product.category === filters.category),
    )
    return sortProducts(filtered, filters.sort)
  }, [products, filters])
}

export function FilterBar({
  filters,
  onChange,
  products,
  resultCount,
}: {
  filters: ListFilters
  onChange: (filters: ListFilters) => void
  products: Product[]
  resultCount: number
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1)
    }
    return map
  }, [products])

  const set = <K extends keyof ListFilters>(key: K, value: ListFilters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => set('query', event.target.value)}
          placeholder="Search name, brand, category or store"
          aria-label="Search products"
          className="h-12 w-full rounded-full border border-line bg-surface pr-11 pl-11 text-[15px] text-ink shadow-card placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => set('query', '')}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
          >
            <IconClose className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto scroll-smooth px-1 pb-1 scrollbar-none">
        {STATUS_OPTIONS.map((option) => {
          const active = filters.status === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => set('status', option.value)}
              aria-pressed={active}
              className={cx(
                'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition',
                active
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-28 flex-1 sm:max-w-52">
          <span className="sr-only">Filter by category</span>
          <select
            value={filters.category}
            onChange={(event) => set('category', event.target.value as Category | 'all')}
            className="h-10 w-full rounded-full border border-line bg-surface px-3.5 text-[13.5px] font-medium text-ink-soft focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
          >
            <option value="all">All categories ({products.length})</option>
            {CATEGORIES.filter((category) => counts.has(category)).map((category) => (
              <option key={category} value={category}>
                {category} ({counts.get(category)})
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-28 flex-1 sm:max-w-56">
          <span className="sr-only">Sort products</span>
          <div className="relative">
            <IconSort className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
            <select
              value={filters.sort}
              onChange={(event) => set('sort', event.target.value as SortKey)}
              className="h-10 w-full rounded-full border border-line bg-surface pr-3 pl-10 text-[13.5px] font-medium text-ink-soft focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </label>

        <p
          className="tnum ml-auto shrink-0 text-[12.5px] text-ink-muted"
          aria-live="polite"
        >
          {resultCount} of {products.length}
        </p>
      </div>
    </div>
  )
}
