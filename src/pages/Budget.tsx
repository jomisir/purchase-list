import { useEffect, useMemo, useState } from 'react'
import { categoryTotals, computeTotals } from '@/lib/calc'
import { formatMoney, formatPercent, parsePrice } from '@/lib/money'
import { cx } from '@/lib/cx'
import { usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { budgetStatusCopy, STATUS_TONE } from '@/components/BudgetSummary'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { IconCheck, IconInfo } from '@/components/icons'

const QUICK_BUDGETS = [4000, 5000, 5500, 6000, 7000]

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string
  value: string
  tone?: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className={cx('text-[13.5px]', strong ? 'font-semibold text-ink' : 'text-ink-soft')}>
        {label}
      </dt>
      <dd
        className={cx(
          'tnum font-semibold',
          strong ? 'text-[17px]' : 'text-[15px]',
          tone ?? 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function Budget() {
  const { state, actions } = usePlanner()
  const toast = useToast()
  const totals = useMemo(
    () => computeTotals(state.products, state.settings.budget),
    [state.products, state.settings.budget],
  )
  const categories = useMemo(() => categoryTotals(state.products), [state.products])

  const [custom, setCustom] = useState(String(state.settings.budget))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCustom(String(state.settings.budget))
  }, [state.settings.budget])

  const status = budgetStatusCopy(totals)

  function applyCustom(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parsePrice(custom)
    if (parsed === null) return setError('Enter a budget amount.')
    if (Number.isNaN(parsed)) return setError('That budget is not a number.')
    if (parsed < 0) return setError('A budget cannot be negative.')
    if (parsed > 100_000_000) return setError('That budget is unrealistically large.')
    setError(null)
    actions.setBudget(parsed)
    toast.success(`Budget set to ${formatMoney(parsed)}.`)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">Budget</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Set what you are willing to spend. Everything else is calculated from your products.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            Total budget
          </p>
          <p className="tnum mt-1 text-[32px] leading-none font-semibold tracking-tight text-ink">
            {formatMoney(state.settings.budget)}
          </p>

          <div className="mt-4">
            <ProgressBar
              value={totals.percentUsed}
              tone={STATUS_TONE[totals.status]}
              label={`${formatPercent(totals.percentUsed)} of budget spent`}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold',
                  status.className,
                )}
              >
                {status.icon}
                {status.label}
              </span>
              <span className="tnum text-[13px] font-semibold text-ink-soft">{status.detail}</span>
            </div>
          </div>
        </div>

        <dl className="divide-y divide-line">
          <Row label="Budget" value={formatMoney(totals.budget)} strong />
          <Row label="Estimated cost of everything planned" value={formatMoney(totals.estimatedTotal)} />
          <Row label="Actual cost so far" value={formatMoney(totals.actualTotal)} tone="text-brand" />
          <Row
            label="Remaining"
            value={
              totals.remaining < 0
                ? `${formatMoney(Math.abs(totals.remaining))} over`
                : formatMoney(totals.remaining)
            }
            tone={totals.remaining < 0 ? 'text-negative' : 'text-positive'}
            strong
          />
          <Row label="Percentage used" value={formatPercent(totals.percentUsed, 1)} />
          <Row
            label="Projected total (spent + best known prices)"
            value={formatMoney(totals.projectedTotal)}
            tone={totals.projectedTotal > totals.budget ? 'text-caution' : 'text-ink'}
          />
          <Row
            label="Variance on what you have bought"
            value={
              totals.varianceOnPurchased === 0
                ? 'On estimate'
                : `${formatMoney(Math.abs(totals.varianceOnPurchased))} ${
                    totals.varianceOnPurchased < 0 ? 'saved' : 'over'
                  }`
            }
            tone={totals.varianceOnPurchased > 0 ? 'text-negative' : 'text-positive'}
          />
        </dl>
      </Card>

      {totals.status === 'over' ? (
        <Card className="flex items-start gap-3 border-negative/30 bg-negative-soft p-4">
          <IconInfo className="mt-0.5 size-5 shrink-0 text-negative" />
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-negative">
              You are {formatMoney(Math.abs(totals.remaining))} over budget.
            </span>{' '}
            Nothing is blocked — keep buying if you want to. Raise the budget below if the number
            no longer reflects your plan.
          </p>
        </Card>
      ) : null}

      <section>
        <SectionHeading title="Set your budget" hint="Saved instantly and kept after a refresh." />
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {QUICK_BUDGETS.map((amount) => {
              const active = state.settings.budget === amount
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    actions.setBudget(amount)
                    toast.success(`Budget set to ${formatMoney(amount)}.`)
                  }}
                  aria-pressed={active}
                  className={cx(
                    'tnum inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-semibold transition',
                    active
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-line bg-surface text-ink-soft hover:border-line-strong',
                  )}
                >
                  {active ? <IconCheck className="size-4" /> : null}
                  {formatMoney(amount)}
                </button>
              )
            })}
          </div>

          <form onSubmit={applyCustom} noValidate className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1">
              <TextField
                label="Custom budget"
                inputMode="decimal"
                prefix="AED"
                value={custom}
                onChange={(event) => {
                  setCustom(event.target.value)
                  setError(null)
                }}
                error={error}
              />
            </div>
            <Button type="submit" size="lg">
              Set budget
            </Button>
          </form>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Where the budget goes"
          hint="Estimated cost per category, from your product list."
        />
        <Card className="divide-y divide-line">
          {categories.map((entry) => {
            const share = totals.estimatedTotal > 0 ? (entry.estimated / totals.estimatedTotal) * 100 : 0
            return (
              <div key={entry.category} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{entry.category}</p>
                  <p className="tnum shrink-0 text-[13px] font-semibold text-ink">
                    {formatMoney(entry.estimated)}
                  </p>
                </div>
                <ProgressBar
                  size="sm"
                  className="mt-2"
                  value={share}
                  tone="brand"
                  label={`${entry.category} is ${formatPercent(share)} of the estimated total`}
                />
                <p className="tnum mt-1.5 text-[11.5px] text-ink-muted">
                  {formatPercent(share)} of the plan · {formatMoney(entry.actual)} spent
                </p>
              </div>
            )
          })}
        </Card>
      </section>
    </div>
  )
}
