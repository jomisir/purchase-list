import { useMemo, useState } from 'react'
import { spendingSeries, type SpendPoint } from '@/lib/spending'
import { formatMoney, formatNumber } from '@/lib/money'
import { formatLongDate, formatShortDate } from '@/lib/date'
import { cx } from '@/lib/cx'
import { useBudget, usePlanner, useProducts } from '@/context/plannerContext'
import { useElementWidth } from '@/hooks/useElementWidth'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconAlert, IconCart } from '@/components/icons'

const PLOT_HEIGHT = 176
const AXIS_BAND = 26
const PAD_LEFT = 52
const PAD_RIGHT = 16
const PAD_TOP = 18

/** Rounded, human y-axis ceiling — 0 / 2,000 / 4,000 rather than 0 / 1,847. */
/** Rounded, human y-axis ceiling — 0 / 2,000 / 4,000 rather than 0 / 1,847. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    const candidate = step * magnitude
    if (candidate >= value) return candidate
  }
  return 10 * magnitude
}

export function SpendingChart() {
  const { state } = usePlanner()
  const products = useProducts()
  const { settings } = state
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')

  const series = useMemo(
    () => spendingSeries(products, settings.currency, settings.rates),
    [products, settings.currency, settings.rates],
  )

  const budget = useBudget()
  const currency = settings.currency

  if (series.points.length === 0) {
    return (
      <Card className="p-4 sm:p-5">
        <Heading currency={currency} series={series} budget={budget} />
        <EmptyState
          compact
          className="mt-3"
          icon={<IconCart className="size-5" />}
          title="Nothing bought yet"
          description="Check items off as you buy them and this will chart what you have spent against your budget, day by day."
        />
      </Card>
    )
  }

  // Draw only once the card has been measured, so the SVG can never be forced
  // wider than the space it sits in. The placeholder holds the height so
  // nothing jumps when the real chart appears.
  const chartWidth = width
  const innerWidth = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 40)
  const points = series.points

  // The budget is part of the scale on purpose: the question this chart answers
  // is "how much of the budget is gone", which needs the ceiling in view.
  // When the budget is the larger number it becomes the ceiling exactly, so the
  // threshold sits on the top gridline and the data gets the whole plot height
  // instead of being squashed under a rounded-up axis.
  const ceiling =
    budget > 0 && budget >= series.total ? budget : niceCeiling(series.total * 1.05)
  const x = (index: number) =>
    PAD_LEFT + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
  const y = (value: number) => PAD_TOP + (1 - value / ceiling) * PLOT_HEIGHT

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.total)}`).join(' ')
  const area = `${line} L${x(points.length - 1)} ${PAD_TOP + PLOT_HEIGHT} L${x(0)} ${PAD_TOP + PLOT_HEIGHT} Z`
  const ticks = [0, 0.5, 1].map((fraction) => fraction * ceiling)

  const lastIndex = points.length - 1
  const shown = active == null ? lastIndex : active
  const point = points[shown]
  const budgetVisible = budget > 0 && budget <= ceiling

  // Space the x labels evenly across the axis, always keeping the first and the
  // last. Striding from zero and then bolting the final label on leaves the last
  // two sitting on top of each other.
  const maxLabels = Math.max(2, Math.floor(innerWidth / 72))
  const labelCount = Math.min(points.length, maxLabels)
  const labelIndexes =
    labelCount <= 1
      ? [lastIndex]
      : [
          ...new Set(
            Array.from({ length: labelCount }, (_, i) =>
              Math.round((i / (labelCount - 1)) * lastIndex),
            ),
          ),
        ]

  function pick(clientX: number, target: SVGSVGElement) {
    const box = target.getBoundingClientRect()
    const local = clientX - box.left
    const ratio = (local - PAD_LEFT) / innerWidth
    const index = Math.round(ratio * (points.length - 1))
    setActive(Math.max(0, Math.min(points.length - 1, index)))
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <Heading
          currency={currency}
          series={series}
          budget={budget}
          selected={active == null ? null : points[active]}
        />
        <div
          role="group"
          aria-label="How to show the spending data"
          className="flex shrink-0 rounded-full border border-line p-0.5"
        >
          {(['chart', 'table'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={cx(
                'rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition',
                view === mode ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {series.unconverted.length > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-caution-soft px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
          <IconAlert className="mt-0.5 size-3.5 shrink-0 text-caution" />
          {series.unconverted.length} purchase
          {series.unconverted.length === 1 ? '' : 's'} left out — no rate for{' '}
          {[...new Set(series.unconverted.map((item) => item.currency))].join(', ')}.
        </p>
      ) : null}

      {view === 'table' ? (
        <SpendTable points={points} currency={currency} />
      ) : (
        <div ref={wrapRef} className="relative mt-3">
          {chartWidth === 0 ? (
            <div style={{ height: PLOT_HEIGHT + PAD_TOP + AXIS_BAND }} aria-hidden="true" />
          ) : (
          <svg
            width={chartWidth}
            height={PLOT_HEIGHT + PAD_TOP + AXIS_BAND}
            role="img"
            tabIndex={0}
            aria-label={`Cumulative spending. ${formatMoney(series.total, currency)} across ${series.daySpan} day${series.daySpan === 1 ? '' : 's'}${budget > 0 ? `, against a budget of ${formatMoney(budget, currency)}` : ''}. Use the arrow keys to step through each day, or switch to the table view.`}
            className="block touch-pan-y outline-none"
            onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
            onPointerDown={(event) => pick(event.clientX, event.currentTarget)}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault()
                const step = event.key === 'ArrowRight' ? 1 : -1
                setActive((current) => {
                  const next = (current == null ? lastIndex : current) + step
                  return Math.max(0, Math.min(lastIndex, next))
                })
              }
              if (event.key === 'Home') setActive(0)
              if (event.key === 'End') setActive(lastIndex)
              if (event.key === 'Escape') setActive(null)
            }}
          >
            {/* Gridlines: solid hairlines, one step off the surface. */}
            <g>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD_LEFT}
                    x2={chartWidth - PAD_RIGHT}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD_LEFT - 8}
                    y={y(tick) + 4}
                    textAnchor="end"
                    className="tnum"
                    fontSize="10.5"
                    fill="var(--ink-muted)"
                  >
                    {formatNumber(tick, currency)}
                  </text>
                </g>
              ))}
            </g>

            {/* Budget threshold: dashed and directly labelled, so it stays
                distinct from the spend line without relying on hue. */}
            {budgetVisible ? (
              <g>
                <line
                  x1={PAD_LEFT}
                  x2={chartWidth - PAD_RIGHT}
                  y1={y(budget)}
                  y2={y(budget)}
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text
                  x={chartWidth - PAD_RIGHT}
                  y={y(budget) - 6}
                  textAnchor="end"
                  fontSize="10.5"
                  fontWeight="600"
                  fill="var(--ink-soft)"
                >
                  Budget {formatMoney(budget, currency)}
                </text>
              </g>
            ) : null}

            <defs>
              <linearGradient id="spend-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#spend-wash)" />
            <path
              d={line}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Crosshair finds the x; readers aim at a day, not at a 2px line. */}
            {active != null ? (
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD_TOP}
                y2={PAD_TOP + PLOT_HEIGHT}
                stroke="var(--ink-faint)"
                strokeWidth="1"
              />
            ) : null}

            {/* End marker, and the hovered one, each with a surface ring. */}
            <circle
              cx={x(shown)}
              cy={y(point.total)}
              r="4.5"
              fill="var(--brand)"
              stroke="var(--surface)"
              strokeWidth="2"
            />

            <g>
              {labelIndexes.map((index) => (
                <text
                  key={points[index].date}
                  x={x(index)}
                  y={PAD_TOP + PLOT_HEIGHT + 16}
                  textAnchor={index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'}
                  className="tnum"
                  fontSize="10.5"
                  fill="var(--ink-muted)"
                >
                  {formatShortDate(points[index].date)}
                </text>
              ))}
            </g>
          </svg>
          )}

        </div>
      )}
    </Card>
  )
}

function Heading({
  currency,
  series,
  budget,
  selected,
}: {
  currency: string
  series: ReturnType<typeof spendingSeries>
  budget: number
  selected?: SpendPoint | null
}) {
  const share = budget > 0 ? (series.total / budget) * 100 : 0
  const value = selected ? selected.total : series.total

  return (
    <div className="min-w-0">
      <h2 className="text-[13px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
        Spending over time
      </h2>
      {/* Proportional figures: tabular digits make a headline number look loose. */}
      <p className="mt-1 text-[22px] leading-none font-semibold tracking-tight text-ink">
        {formatMoney(value, currency)}
      </p>
      <p
        className="mt-1.5 min-h-[1.1em] text-[12.5px] text-ink-muted"
        role="status"
        aria-live="polite"
      >
        {series.points.length === 0
          ? 'No purchases recorded yet'
          : selected
            ? `${formatLongDate(selected.date)} · ${
                selected.daySpend > 0
                  ? `${formatMoney(selected.daySpend, currency)} that day`
                  : 'nothing bought'
              }`
            : `Across ${series.daySpan} day${series.daySpan === 1 ? '' : 's'}${
                budget > 0 ? ` · ${share.toFixed(0)}% of budget` : ''
              }`}
      </p>
    </div>
  )
}

/** The table twin — every value the chart shows, reachable without hovering. */
function SpendTable({ points, currency }: { points: SpendPoint[]; currency: string }) {
  const spendingDays = points.filter((point) => point.daySpend > 0)
  return (
    <div className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-line">
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">Spending by day, with the running total</caption>
        <thead className="sticky top-0 bg-surface-muted text-[10.5px] tracking-[0.05em] text-ink-muted uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Day</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Spent</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Running total</th>
          </tr>
        </thead>
        <tbody>
          {spendingDays.map((point) => (
            <tr key={point.date} className="border-t border-line align-top">
              <th scope="row" className="px-3 py-2.5 font-medium text-ink">
                <span className="tnum">{formatLongDate(point.date)}</span>
                {point.items.length > 0 ? (
                  <span className="mt-0.5 block text-[11.5px] font-normal text-ink-muted">
                    {point.items.map((item) => item.name).join(', ')}
                  </span>
                ) : null}
              </th>
              <td className="tnum px-3 py-2.5 text-right font-semibold text-ink">
                {formatMoney(point.daySpend, currency)}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ink-muted">
                {formatMoney(point.total, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
