import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type BadgeTone = 'neutral' | 'brand' | 'positive' | 'caution' | 'negative' | 'gold'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-soft border-line',
  brand: 'bg-brand-soft text-brand-ink border-brand/20',
  positive: 'bg-positive-soft text-positive border-positive/20',
  caution: 'bg-caution-soft text-caution border-caution/20',
  negative: 'bg-negative-soft text-negative border-negative/20',
  gold: 'bg-gold-soft text-gold-ink border-gold/25',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
