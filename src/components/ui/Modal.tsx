import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { IconClose } from '@/components/icons'

/**
 * Bottom sheet on phones, centred dialog on larger screens. Focus is trapped
 * by the native <dialog> element and Escape closes it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      document.body.style.overflow = 'hidden'
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cx(
        'm-0 max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50',
        'fixed inset-0 h-full',
      )}
    >
      <div className="flex h-full w-full items-end justify-center sm:items-center sm:p-6">
        <div
          className={cx(
            'flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface text-ink shadow-pop',
            'rounded-t-3xl sm:rounded-card animate-slide-up',
            size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-[17px] font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            >
              <IconClose className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-line bg-surface px-5 py-3.5 pb-safe">{footer}</div>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
