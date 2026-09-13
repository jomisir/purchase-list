import { useEffect, useState } from 'react'
import {
  getInstallPrompt,
  isIos,
  isSecureContextForInstall,
  isStandalone,
  subscribeToInstallPrompt,
} from '@/lib/pwa'

export interface InstallState {
  /** Already launched from the home screen. */
  installed: boolean
  /** The browser has offered a one-tap install. */
  canPrompt: boolean
  /** iOS: installation is manual, via the Share sheet. */
  needsIosInstructions: boolean
  /** Service workers are unavailable, so offline caching will not happen. */
  insecureContext: boolean
}

export function useInstallState(): InstallState {
  const [canPrompt, setCanPrompt] = useState(() => getInstallPrompt() !== null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => subscribeToInstallPrompt(() => setCanPrompt(getInstallPrompt() !== null)), [])

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const update = () => setInstalled(isStandalone())
    media.addEventListener('change', update)
    window.addEventListener('appinstalled', update)
    return () => {
      media.removeEventListener('change', update)
      window.removeEventListener('appinstalled', update)
    }
  }, [])

  return {
    installed,
    canPrompt: canPrompt && !installed,
    needsIosInstructions: isIos() && !installed && !canPrompt,
    insecureContext: !isSecureContextForInstall(),
  }
}
