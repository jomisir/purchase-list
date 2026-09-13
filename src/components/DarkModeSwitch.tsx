import { usePlanner } from '@/context/plannerContext'
import { useResolvedTheme } from '@/hooks/useResolvedTheme'
import { cx } from '@/lib/cx'
import { IconMoon, IconSun } from '@/components/icons'

/**
 * A plain on/off switch for dark mode.
 *
 * The app stores three preferences (system, light, dark) but this control is
 * binary on purpose: it shows what you are actually looking at, and flipping it
 * commits to that choice. While the stored preference is still `system` the
 * switch is marked "Auto", so it is obvious the device is in charge — and
 * Settings is where you can hand control back to it.
 */
export function DarkModeSwitch({ className }: { className?: string }) {
  const { state, actions } = usePlanner()
  const resolved = useResolvedTheme()
  const dark = resolved === 'dark'
  const auto = state.settings.theme === 'system'

  const label = `Dark mode ${dark ? 'on' : 'off'}${auto ? ', following your device' : ''}. Switch it ${dark ? 'off' : 'on'}.`

  return (
    <label
      title={label}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-3 transition hover:border-line-strong',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={dark}
        aria-label={label}
        onChange={(event) => actions.setTheme(event.target.checked ? 'dark' : 'light')}
        className="peer sr-only"
      />

      <span aria-hidden="true" className="text-ink-soft">
        {dark ? <IconMoon className="size-4" /> : <IconSun className="size-4" />}
      </span>

      <span className="text-[13px] font-semibold whitespace-nowrap text-ink-soft">
        <span className="sr-only sm:not-sr-only">Dark mode</span>
      </span>

      {auto ? (
        <span className="rounded-full bg-surface-muted px-1.5 py-px text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
          Auto
        </span>
      ) : null}

      {/* The track. Sized generously so it stays an easy thumb target. */}
      <span
        aria-hidden="true"
        className={cx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          dark ? 'bg-brand' : 'bg-surface-sunken',
        )}
      >
        <span
          className={cx(
            'absolute size-5 rounded-full bg-surface shadow-card transition-[left] duration-200 ease-out',
            dark ? 'left-[calc(100%-1.375rem)]' : 'left-0.5',
          )}
        />
      </span>
    </label>
  )
}
