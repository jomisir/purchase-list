import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { categoryTotals, dealStatus, lineEstimate, priceStats } from '@/lib/calc'
import { formatMoney, formatPercent } from '@/lib/money'
import { formatRelativeDay } from '@/lib/date'
import { cx } from '@/lib/cx'
import { usePlanner, useTotals } from '@/context/plannerContext'
import { useProductDialogs } from '@/hooks/useProductDialogs'
import { BudgetSummary } from '@/components/BudgetSummary'
import { InstallHint } from '@/components/InstallHint'
import { DarkModeSwitch } from '@/components/DarkModeSwitch'
import { ProductCard } from '@/components/ProductCard'
import { ProductImage } from '@/components/ProductImage'
import { DealBadge } from '@/components/DealBadge'
import { Card, SectionHeading } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import {
  IconCart,
  IconChevronRight,
  IconInfo,
  IconPlus,
  IconSparkle,
  IconTag,
} from '@/components/icons'

export function Dashboard() {
  const { state } = usePlanner()
  const { products, settings } = state
  const { dialogs, openDetails, openEdit, openLogPrice, togglePurchased } = useProductDialogs()

  const totals = useTotals()
  const categories = useMemo(
    () => categoryTotals(products, settings.currency, settings.rates),
    [products, settings.currency, settings.rates],
  )

  const upNext = useMemo(
    () =>
      products
        .filter((product) => !product.purchased)
        .sort((a, b) => lineEstimate(b) - lineEstimate(a))
        .slice(0, 3),
    [products],
  )

  const deals = useMemo(
    () =>
      products
        .filter((product) => !product.purchased)
        .map((product) => ({ product, status: dealStatus(product) }))
        .filter((entry) => entry.status === 'good' || entry.status === 'great')
        .slice(0, 4),
    [products],
  )

  const recentPrices = useMemo(
    () =>
      products
        .filter((product) => product.priceHistory.length > 0)
        .map((product) => ({ product, stats: priceStats(product.priceHistory) }))
        .sort((a, b) =>
          (b.stats.latestRecord?.date ?? '').localeCompare(a.stats.latestRecord?.date ?? ''),
        )
        .slice(0, 5),
    [products],
  )

  if (products.length === 0) {
    return (
      <>
        <EmptyState
          icon={<IconCart className="size-6" />}
          title="Your planner is empty"
          description="Add your first product, or restore the starter plan from Settings."
          action={
            <ButtonLink to="/add">
              <IconPlus className="size-4" />
              Add a product
            </ButtonLink>
          }
        />
        {dialogs}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        {/* The switch sits on the heading line so the sentence below keeps the
            full width and does not concertina on a narrow phone. */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">
            Dashboard
          </h1>
          <DarkModeSwitch />
        </div>
        <p className="mt-1 text-[13px] text-ink-muted lg:text-[14px]">
          Everything you planned to buy, and what it is costing you.
        </p>
      </header>

      <InstallHint />

      <BudgetSummary totals={totals} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
              Shopping progress
            </h2>
            <span className="tnum text-[13px] font-semibold text-ink">
              {formatPercent(totals.completion)}
            </span>
          </div>
          <p className="tnum mt-2 text-[24px] font-semibold tracking-tight text-ink">
            {totals.purchasedCount}
            <span className="text-[15px] font-medium text-ink-muted"> / {totals.totalCount} bought</span>
          </p>
          <ProgressBar
            value={totals.completion}
            tone="brand"
            label={`${formatPercent(totals.completion)} of items bought`}
            className="mt-3"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink to="/shopping" size="sm" variant="contrast">
              <IconCart className="size-4" />
              Shopping Mode
            </ButtonLink>
            <ButtonLink to="/list" size="sm" variant="secondary">
              Open list
            </ButtonLink>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
            Estimate vs budget
          </h2>
          <p
            className={cx(
              'tnum mt-2 text-[24px] font-semibold tracking-tight',
              totals.estimatedTotal > totals.budget ? 'text-caution' : 'text-positive',
            )}
          >
            {formatMoney(Math.abs(totals.estimatedTotal - totals.budget), totals.currency)}
            <span className="text-[15px] font-medium text-ink-muted">
              {totals.estimatedTotal > totals.budget ? ' over plan' : ' of headroom'}
            </span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            Your {totals.totalCount} planned items add up to{' '}
            <span className="tnum font-semibold text-ink">{formatMoney(totals.estimatedTotal, totals.currency)}</span>{' '}
            against a budget of{' '}
            <span className="tnum font-semibold text-ink">{formatMoney(totals.budget, totals.currency)}</span>.
          </p>
          <ButtonLink to="/budget" size="sm" variant="secondary" className="mt-4">
            Adjust budget
          </ButtonLink>
        </Card>
      </div>

      <Card className="flex items-start gap-3 border-brand/25 bg-brand-soft/40 p-4">
        <IconInfo className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">These prices are planning estimates.</span> No
          live pricing is connected, so nothing here is a real-time shop price. Log what you
          actually see in a store and the targets, deals and totals update from your own numbers.
        </p>
      </Card>

      {deals.length > 0 ? (
        <section>
          <SectionHeading
            title="Deals against your targets"
            hint="Based only on the prices you have logged."
            action={
              <Link
                to="/prices"
                className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand hover:underline"
              >
                Price tracker
                <IconChevronRight className="size-4" />
              </Link>
            }
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {deals.map(({ product }) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openDetails(product)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-card transition hover:-translate-y-px hover:shadow-pop"
              >
                <ProductImage
                  image={product.image}
                  name={product.name}
                  category={product.category}
                  className="size-14 shrink-0 rounded-xl border border-image-panel-line"
                  imageClassName="p-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">
                    {product.name}
                  </span>
                  <span className="tnum mt-0.5 block text-[12.5px] text-ink-muted">
                    {formatMoney(product.currentPrice, product.currency)} vs target{' '}
                    {formatMoney(product.targetPrice, product.currency)}
                  </span>
                </span>
                <DealBadge product={product} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {upNext.length > 0 ? (
        <section>
          <SectionHeading
            title="Biggest items still to buy"
            hint="Where most of your budget is going."
            action={
              <Link
                to="/list"
                className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand hover:underline"
              >
                Full list
                <IconChevronRight className="size-4" />
              </Link>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {upNext.map((product) => (
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
        </section>
      ) : (
        <EmptyState
          icon={<IconSparkle className="size-6" />}
          title="Everything is bought"
          description="Every product in your plan is checked off. Nice work."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionHeading
            title="Spending by category"
            hint={categories.length > 6 ? `Top 6 of ${categories.length}` : undefined}
            action={
              <Link
                to="/budget"
                className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand hover:underline"
              >
                All categories
                <IconChevronRight className="size-4" />
              </Link>
            }
          />
          <Card className="divide-y divide-line">
            {categories.slice(0, 6).map((entry) => (
              <div key={entry.category} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{entry.category}</p>
                  <p className="tnum shrink-0 text-[13px] text-ink-muted">
                    <span className="font-semibold text-ink">{formatMoney(entry.actual, totals.currency)}</span>
                    {' / '}
                    {formatMoney(entry.estimated, totals.currency)}
                  </p>
                </div>
                <ProgressBar
                  size="sm"
                  className="mt-2"
                  value={entry.estimated > 0 ? (entry.actual / entry.estimated) * 100 : 0}
                  tone={entry.actual > entry.estimated ? 'negative' : 'brand'}
                  label={`${entry.category}: ${formatMoney(entry.actual, totals.currency)} spent of ${formatMoney(entry.estimated, totals.currency)} estimated`}
                />
                <p className="tnum mt-1.5 text-[11.5px] text-ink-muted">
                  {entry.done}/{entry.count} bought
                </p>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <SectionHeading title="Latest prices you logged" />
          {recentPrices.length === 0 ? (
            <EmptyState
              compact
              icon={<IconTag className="size-5" />}
              title="No prices logged yet"
              description="Once you start checking prices in stores, the most recent ones show up here."
            />
          ) : (
            <Card className="divide-y divide-line">
              {recentPrices.map(({ product, stats }) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openDetails(product)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {product.name}
                    </span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {stats.latestRecord?.store ?? 'Unspecified store'} ·{' '}
                      {formatRelativeDay(stats.latestRecord?.date ?? '')}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right">
                    <span className="block text-[14px] font-semibold text-ink">
                      {formatMoney(stats.latest, product.currency)}
                    </span>
                    <span className="block text-[11.5px] text-ink-muted">
                      low {formatMoney(stats.lowest, product.currency)}
                    </span>
                  </span>
                </button>
              ))}
            </Card>
          )}
        </section>
      </div>

      {dialogs}
    </div>
  )
}
