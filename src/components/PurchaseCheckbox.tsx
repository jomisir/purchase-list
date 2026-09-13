import { cx } from '@/lib/cx'
import { IconCheck } from '@/components/icons'

/**
 * Large, obviously tappable checkbox. The native input stays in the DOM so
 * keyboard focus, labels and screen readers all behave normally.
 */
export function PurchaseCheckbox({
  checked,
  onChange,
  label,
  size = 'md',
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  size?: 'md' | 'lg'
  className?: string
}) {
  const box = size === 'lg' ? 'size-11' : 'size-8'
  return (
    <label
      className={cx(
        'group relative inline-flex shrink-0 cursor-pointer items-center justify-center',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        aria-label={label}
      />
      <span
        aria-hidden="true"
        className={cx(
          box,
          'grid place-items-center rounded-xl border-2 transition',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
          checked
            ? 'border-brand bg-brand text-on-brand'
            : 'border-line-strong bg-surface text-transparent group-hover:border-brand/60',
        )}
      >
        <IconCheck className={size === 'lg' ? 'size-6' : 'size-5'} strokeWidth={2.6} />
      </span>
    </label>
  )
}
