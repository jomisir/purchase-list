import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-muted text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className,
      )}
    >
      {icon ? (
        <div
          className={cx(
            'mb-3 grid place-items-center rounded-full bg-surface text-ink-faint shadow-card',
            compact ? 'size-10' : 'size-14',
          )}
        >
          {icon}
        </div>
      ) : null}
      <h3 className={cx('font-semibold text-ink', compact ? 'text-[14px]' : 'text-[15px]')}>
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
