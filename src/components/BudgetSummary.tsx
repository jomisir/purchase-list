import type { BudgetStatus, BudgetTotals } from '@/types'
import { formatMoney, formatPercent } from '@/lib/money'
import { cx } from '@/lib/cx'
import { ProgressBar, type ProgressTone } from '@/components/ui/ProgressBar'
import { IconAlert, IconCheck, IconInfo } from '@/components/icons'

export const STATUS_TONE: Record<BudgetStatus, ProgressTone> = {
  under: 'positive',
  approaching: 'caution',
  over: 'negative',
}

/**
 * How the progress bar should read. With no budget there is nothing to be a
 * proportion of, so the bar stays empty and neutral rather than implying a
 * percentage of zero.
 */
export function budgetBar(totals: BudgetTotals): {
  value: number
  tone: ProgressTone
  label: string
} {
  if (totals.budget <= 0) {
    return { value: 0, tone: 'brand', label: 'No budget set yet' }
  }
  return {
    value: totals.percentUsed,
    tone: STATUS_TONE[totals.status],
    label: `${formatPercent(totals.percentUsed)} of budget spent`,
  }
}

/** Status is never carried by colour alone — it always ships with a word and an icon. */
export function budgetStatusCopy(totals: BudgetTotals): {
  label: string
  detail: string
  icon: React.ReactNode
  className: string
} {
  // A list can exist before its budget does — an imported one, or a new one set
  // to zero. Calling that "under budget" would be flattering nonsense, and
  // "over budget" the moment anything is bought would be alarming nonsense.
  if (totals.budget <= 0) {
    return {
      label: 'No budget set',
      detail:
        totals.actualTotal > 0
          ? `${formatMoney(totals.actualTotal, totals.currency)} spent so far`
          : 'Set one to track your spending',
      icon: <IconInfo className="size-4" />,
      className: 'bg-surface-muted text-ink-soft border-line-strong',
    }
  }
  if (totals.status === 'over') {
    return {
      label: 'Over budget',
      detail: `${formatMoney(Math.abs(totals.remaining), totals.currency)} over budget`,
      icon: <IconAlert className="size-4" />,
      className: 'bg-negative-soft text-negative border-negative/25',
    }
  }
  if (totals.status === 'approaching') {
    return {
      label: 'Approaching budget limit',
      detail: `${formatMoney(totals.remaining, totals.currency)} remaining`,
      icon: <IconInfo className="size-4" />,
      className: 'bg-caution-soft text-caution border-caution/25',
    }
  }
  return {
    label: 'Under budget',
    detail: `${formatMoney(totals.remaining, totals.currency)} remaining`,
    icon: <IconCheck className="size-4" />,
    className: 'bg-positive-soft text-positive border-positive/25',
  }
}

function Figure({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string
  value: string
  tone?: string
  emphasis?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd
        className={cx(
          'tnum mt-1 font-semibold tracking-tight',
          emphasis ? 'text-[22px] sm:text-[26px]' : 'text-[17px] sm:text-[19px]',
          tone ?? 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function BudgetSummary({ totals }: { totals: BudgetTotals }) {
  const status = budgetStatusCopy(totals)
  const bar = budgetBar(totals)
  return (
    <section
      aria-label="Budget summary"
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div className="border-b border-line bg-gradient-to-br from-brand-soft/70 to-surface px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Figure label="Total budget" value={formatMoney(totals.budget, totals.currency)} emphasis />
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold',
              status.className,
            )}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        <div className="mt-3">
          <ProgressBar value={bar.value} tone={bar.tone} label={bar.label} />
          <div className="mt-1.5 flex items-center justify-between text-[12px] text-ink-muted">
            <span className="tnum font-semibold">
              {totals.budget > 0 ? `${formatPercent(totals.percentUsed)} used` : 'No budget set'}
            </span>
            <span className="tnum">{status.detail}</span>
          </div>
        </div>
      </div>

      {totals.unconverted.length > 0 ? (
        <p className="flex items-start gap-2.5 border-b border-line bg-caution-soft px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft sm:px-5">
          <IconAlert className="mt-0.5 size-4 shrink-0 text-caution" />
          <span>
            <span className="font-semibold text-caution">
              {totals.unconverted.length} item{totals.unconverted.length === 1 ? '' : 's'} not counted
              below.
            </span>{' '}
            No exchange rate for{' '}
            {[...new Set(totals.unconverted.map((item) => item.currency))].join(', ')}. Refresh the
            rates in Settings, or set one by hand.
          </span>
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 sm:grid-cols-4 sm:px-5">
        <Figure label="Estimated" value={formatMoney(totals.estimatedTotal, totals.currency)} />
        <Figure label="Spent" value={formatMoney(totals.actualTotal, totals.currency)} tone="text-brand" />
        <Figure
          label="Remaining"
          value={formatMoney(totals.remaining, totals.currency)}
          tone={totals.remaining < 0 ? 'text-negative' : 'text-positive'}
        />
        <Figure
          label="Projected total"
          value={formatMoney(totals.projectedTotal, totals.currency)}
          tone={totals.projectedTotal > totals.budget ? 'text-caution' : 'text-ink'}
        />
      </dl>
    </section>
  )
}
