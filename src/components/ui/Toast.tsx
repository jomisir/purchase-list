import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { IconAlert, IconCheck, IconInfo } from '@/components/icons'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}

const tones: Record<ToastTone, { className: string; icon: ReactNode }> = {
  success: {
    className: 'bg-positive-soft text-positive border-positive/25',
    icon: <IconCheck className="size-4" />,
  },
  error: {
    className: 'bg-negative-soft text-negative border-negative/25',
    icon: <IconAlert className="size-4" />,
  },
  info: {
    className: 'bg-brand-soft text-brand-ink border-brand/25',
    icon: <IconInfo className="size-4" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, tone, message }])
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2.5 text-[13.5px] font-medium shadow-pop animate-pop-in',
              tones[item.tone].className,
            )}
          >
            <span className="shrink-0">{tones[item.tone].icon}</span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
