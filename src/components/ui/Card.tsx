import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-card border border-line bg-surface shadow-card',
        className,
      )}
      {...props}
    />
  )
}

export function SectionHeading({
  title,
  hint,
  action,
  className,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
