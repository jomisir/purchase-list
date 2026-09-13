import { cx } from '@/lib/cx'

export type ProgressTone = 'brand' | 'positive' | 'caution' | 'negative'

const tones: Record<ProgressTone, string> = {
  brand: 'bg-brand',
  positive: 'bg-positive',
  caution: 'bg-caution',
  negative: 'bg-negative',
}

export function ProgressBar({
  value,
  tone = 'brand',
  label,
  size = 'md',
  className,
}: {
  /** Percentage 0-100+; anything over 100 fills the track. */
  value: number
  tone?: ProgressTone
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      className={cx(
        'w-full overflow-hidden rounded-full bg-surface-sunken',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500 ease-out', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
