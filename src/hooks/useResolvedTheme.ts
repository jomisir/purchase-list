import { useEffect, useState } from 'react'
import { useSettings } from '@/context/plannerContext'

const QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/**
 * What the app is actually showing right now, as opposed to what was chosen.
 *
 * A stored preference of `system` resolves to whatever the device is doing, so
 * a control that reflects the current appearance needs this rather than the raw
 * setting.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = useSettings()
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(QUERY)
    const update = () => setPrefersDark(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}
