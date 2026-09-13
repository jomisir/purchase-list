import { useEffect } from 'react'
import { useSettings } from '@/context/plannerContext'

/** Colours the browser chrome — the iOS status bar, the Android address bar. */
const CHROME_COLOUR = { light: '#f4f2ef', dark: '#101211' } as const

/**
 * Keeps a single, media-less `theme-color` meta in sync with the resolved
 * theme, inserting it ahead of the media-scoped pair in `index.html`.
 *
 * Browsers honour the first `theme-color` whose media query matches, so an
 * unscoped tag placed first always wins. Until this runs the media pair is
 * correct on its own, which covers the moment before the app has hydrated.
 */
function setChromeColour(dark: boolean) {
  const head = document.head
  let managed = head.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-managed]')
  if (!managed) {
    managed = document.createElement('meta')
    managed.name = 'theme-color'
    managed.setAttribute('data-managed', '')
    head.prepend(managed)
  }
  managed.content = dark ? CHROME_COLOUR.dark : CHROME_COLOUR.light
}

/** Applies the stored appearance preference to the document root. */
export function ThemeManager() {
  const { theme } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      setChromeColour(dark)
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return null
}
