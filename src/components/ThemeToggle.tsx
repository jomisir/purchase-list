import type { ThemePreference } from '@/types'
import { usePlanner } from '@/context/plannerContext'
import { cx } from '@/lib/cx'
import { IconMoon, IconSun } from '@/components/icons'

const ORDER: ThemePreference[] = ['system', 'light', 'dark']
const LABELS: Record<ThemePreference, string> = {
  system: 'Match device',
  light: 'Light',
  dark: 'Dark',
}

export function ThemeToggle({
  className,
  iconOnly,
}: {
  className?: string
  iconOnly?: boolean
}) {
  const { state, actions } = usePlanner()
  const theme = state.settings.theme
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => actions.setTheme(next)}
      title={`Appearance: ${LABELS[theme]}. Switch to ${LABELS[next]}.`}
      aria-label={`Appearance: ${LABELS[theme]}. Switch to ${LABELS[next]}.`}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface font-semibold text-ink-soft transition hover:bg-surface-muted',
        iconOnly ? 'size-9 shrink-0' : 'h-10 px-4 text-[13px]',
        className,
      )}
    >
      <span className="relative grid place-items-center">
        {theme === 'dark' ? <IconMoon className="size-4.5" /> : <IconSun className="size-4.5" />}
      </span>
      {!iconOnly ? <span>{LABELS[theme]}</span> : null}
    </button>
  )
}
