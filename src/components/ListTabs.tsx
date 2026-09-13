import { useEffect, useRef, useState } from 'react'
import { cx } from '@/lib/cx'
import { MAX_LISTS } from '@/lib/lists'
import { useLists, usePlanner } from '@/context/plannerContext'
import {
  BROWSE,
  CREATE,
  ListManagerModal,
  useListCounts,
  type ListManagerView,
} from '@/components/ListManager'
import { IconLists, IconPlus } from '@/components/icons'

/**
 * The strip of lists above every screen. These are not ARIA tabs — there are no
 * panels to point at; switching one changes the data the whole app is showing —
 * so they are toggle buttons in a labelled group, which is what they behave like.
 */
export function ListTabs() {
  const { actions } = usePlanner()
  const { lists, activeId } = useLists()
  const counts = useListCounts()
  const [managerView, setManagerView] = useState<ListManagerView | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // With several lists the active one can sit off-screen after a reload.
  useEffect(() => {
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>('[data-active="true"]')
    if (!strip || !active) return
    const left = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'instant' as ScrollBehavior })
  }, [activeId, lists.length])

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div
          ref={stripRef}
          role="group"
          aria-label="Shopping lists"
          className="scrollbar-none -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1"
        >
          {lists.map((list) => {
            const count = counts[list.id] ?? { total: 0, purchased: 0 }
            const isActive = list.id === activeId
            return (
              <button
                key={list.id}
                type="button"
                data-active={isActive}
                aria-pressed={isActive}
                onClick={() =>
                  isActive
                    ? setManagerView({ kind: 'edit', listId: list.id })
                    : actions.setActiveList(list.id)
                }
                className={cx(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5',
                  'text-[13px] font-semibold whitespace-nowrap transition active:scale-[0.98]',
                  isActive
                    ? 'border-brand bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink',
                )}
                title={isActive ? `Edit “${list.name}”` : `Switch to “${list.name}”`}
              >
                <span className="max-w-38 truncate">{list.name}</span>
                <span
                  className={cx(
                    'tnum text-[11.5px] font-medium',
                    isActive ? 'text-brand-ink' : 'text-ink-faint',
                  )}
                >
                  {count.purchased}/{count.total}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setManagerView(CREATE)}
            disabled={lists.length >= MAX_LISTS}
            aria-label="New list"
            title={
              lists.length >= MAX_LISTS ? `You can keep up to ${MAX_LISTS} lists.` : 'New list'
            }
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink disabled:opacity-40"
          >
            <IconPlus className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setManagerView(BROWSE)}
            aria-label="Manage lists"
            title="Manage lists"
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink"
          >
            <IconLists className="size-4.5" />
          </button>
        </div>
      </div>

      <ListManagerModal
        open={managerView !== null}
        initialView={managerView ?? BROWSE}
        onClose={() => setManagerView(null)}
      />
    </>
  )
}
