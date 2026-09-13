import { useEffect } from 'react'
import { useSettings } from '@/context/plannerContext'

/** Applies the stored appearance preference to the document root. */
export function ThemeManager() {
  const { theme } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]:not([media])')
        ?.setAttribute('content', dark ? '#101211' : '#f4f2ef')
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return null
}
