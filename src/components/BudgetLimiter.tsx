import { useMemo } from 'react'
import type { BudgetTotals } from '@/types'
import { MAX_ALERT_THRESHOLD, MIN_ALERT_THRESHOLD } from '@/lib/calc'
import { formatMoney, formatPercent } from '@/lib/money'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { Card } from '@/components/ui/Card'
import { budgetStatusCopy } from '@/components/BudgetSummary'
import { IconAlert, IconInfo } from '@/components/icons'

/** A round step for the slider, scaled to the size of the budget. */
function stepFor(max: number): number {
  if (max <= 2_000) return 10
  if (max <= 10_000) return 50
  if (max <= 100_000) return 500
  return 5_000
}

/** A tidy upper bound that always leaves room above the plan. */
function ceilingFor(estimated: number, budget: number): number {
  const target = Math.max(estimated * 1.5, budget * 1.5, 1_000)
  const step = stepFor(target)
  return Math.ceil(target / step) * step
}

/**
 * The budget limiter: drag the ceiling itself, and choose how early the app
 * starts warning. The warning point is the part that was previously fixed at
 * 80% with no way to move it.
 */
export function BudgetLimiter({ totals }: { totals: BudgetTotals }) {
  const { state, actions } = usePlanner()
  const { currency } = totals
  const budget = state.settings.budget
  const threshold = totals.alertThreshold

  const max = useMemo(
    () => ceilingFor(totals.estimatedTotal, budget),
    [totals.estimatedTotal, budget],
  )
  const step = stepFor(max)
  const status = budgetStatusCopy(totals)

  // Where the plan and the spend sit on the same scale as the slider.
  const markers = [
    { label: 'Spent', value: totals.actualTotal, tone: 'bg-brand' },
    { label: 'Planned', value: totals.estimatedTotal, tone: 'bg-caution' },
  ].filter((marker) => marker.value > 0 && marker.value <= max)

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      {/* ---------------------------------------------------------- budget */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            htmlFor="budget-slider"
            className="text-[13px] font-semibold tracking-[0.06em] text-ink-faint uppercase"
          >
            Budget limit
          </label>
          <span className="tnum text-[13px] text-ink-muted">
            up to {formatMoney(max, currency)}
          </span>
        </div>

        <p className="tnum mt-1 text-[26px] leading-none font-semibold tracking-tight text-ink">
          {formatMoney(budget, currency)}
        </p>

        <div className="relative mt-4">
          <input
            id="budget-slider"
            type="range"
            min={0}
            max={max}
            step={step}
            value={Math.min(budget, max)}
            aria-valuetext={formatMoney(budget, currency)}
            onChange={(event) => actions.setBudget(Number(event.target.value))}
            className="h-11 w-full cursor-pointer accent-[var(--brand)]"
            style={{ touchAction: 'pan-y' }}
          />

          {/* Where the plan and the spend fall, so the drag has context. */}
          <div className="pointer-events-none relative -mt-1 h-4">
            {markers.map((marker) => (
              <span
                key={marker.label}
                className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-ink-muted"
                style={{ left: `${Math.min(100, (marker.value / max) * 100)}%` }}
              >
                <span
                  aria-hidden="true"
                  className={cx('mx-auto mb-0.5 block h-2 w-0.5 rounded', marker.tone)}
                />
                {marker.label}
              </span>
            ))}
          </div>
        </div>

        <div
          className={cx(
            'mt-5 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold',
            status.className,
          )}
          role="status"
          aria-live="polite"
        >
          {status.icon}
          <span>{status.label}</span>
          <span className="tnum ml-auto font-medium">{status.detail}</span>
        </div>

        {budget < totals.estimatedTotal ? (
          <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
            <IconInfo className="mt-0.5 size-4 shrink-0 text-caution" />
            Your plan adds up to {formatMoney(totals.estimatedTotal, currency)}, which is{' '}
            {formatMoney(totals.estimatedTotal - budget, currency)} above this limit. Nothing is
            blocked — drop items or raise the limit when you decide.
          </p>
        ) : null}
      </div>

      {/* ------------------------------------------------------- threshold */}
      <div className="border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            htmlFor="alert-slider"
            className="text-[13px] font-semibold tracking-[0.06em] text-ink-faint uppercase"
          >
            Warn me at
          </label>
          <span className="tnum text-[13px] font-semibold text-ink">
            {formatPercent(threshold * 100)} · {formatMoney(totals.alertAmount, currency)}
          </span>
        </div>

        <input
          id="alert-slider"
          type="range"
          min={MIN_ALERT_THRESHOLD * 100}
          max={MAX_ALERT_THRESHOLD * 100}
          step={5}
          value={Math.round(threshold * 100)}
          aria-valuetext={`${Math.round(threshold * 100)} percent, ${formatMoney(totals.alertAmount, currency)}`}
          onChange={(event) => actions.setAlertThreshold(Number(event.target.value) / 100)}
          className="mt-3 h-11 w-full cursor-pointer accent-[var(--caution)]"
          style={{ touchAction: 'pan-y' }}
        />

        <p className="mt-1 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
          <IconAlert className="mt-0.5 size-4 shrink-0 text-caution" />
          Once you have spent {formatMoney(totals.alertAmount, currency)} the budget switches to
          “approaching”. Going over is never blocked — it only changes what the app tells you.
        </p>
      </div>
    </Card>
  )
}
