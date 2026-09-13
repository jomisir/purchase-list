import { useEffect, useMemo, useRef, useState } from 'react'
import type { ShoppingListMeta } from '@/types'
import { formatMoney, parsePrice } from '@/lib/money'
import { cx } from '@/lib/cx'
import { MAX_LISTS } from '@/lib/lists'
import { DEFAULT_BUDGET } from '@/data/seed'
import { useCurrency, useLists, usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { IconAlert, IconCheck, IconEdit, IconPlus, IconTrash } from '@/components/icons'

export type ListManagerView =
  | { kind: 'browse' }
  | { kind: 'create' }
  | { kind: 'edit'; listId: string }
  | { kind: 'delete'; listId: string }

export const BROWSE: ListManagerView = { kind: 'browse' }
export const CREATE: ListManagerView = { kind: 'create' }

const MAX_NAME = 40

/** How many items each list holds, and how many of them are already bought. */
export function useListCounts(): Record<string, { total: number; purchased: number }> {
  const { state } = usePlanner()
  return useMemo(() => {
    const counts: Record<string, { total: number; purchased: number }> = {}
    for (const list of state.lists) counts[list.id] = { total: 0, purchased: 0 }
    for (const product of state.products) {
      const entry = counts[product.listId]
      if (!entry) continue
      entry.total += 1
      if (product.purchased) entry.purchased += 1
    }
    return counts
  }, [state.lists, state.products])
}

function validate(name: string, budgetRaw: string): { budget?: number; errors: { name?: string; budget?: string } } {
  const errors: { name?: string; budget?: string } = {}
  const trimmed = name.trim()
  if (trimmed === '') errors.name = 'Give the list a name.'
  else if (trimmed.length > MAX_NAME) errors.name = `Keep the name under ${MAX_NAME} characters.`

  const parsed = parsePrice(budgetRaw)
  if (parsed === null) errors.budget = 'Set a budget for this list.'
  else if (Number.isNaN(parsed)) errors.budget = 'That budget is not a number.'
  else if (parsed < 0) errors.budget = 'A budget cannot be negative.'
  else if (parsed > 100_000_000) errors.budget = 'That budget is unrealistically large.'

  if (Object.keys(errors).length > 0) return { errors }
  return { budget: parsed ?? 0, errors }
}

/** A radio dressed as a card, for the two ways a new list can start. */
function StartOption({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean
  onChange: () => void
  title: string
  description: string
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition',
        checked ? 'border-brand bg-brand-soft/50' : 'border-line bg-surface hover:bg-surface-muted',
      )}
    >
      <input
        type="radio"
        name="list-start"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4.5 shrink-0 accent-[var(--brand)]"
      />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-muted">
          {description}
        </span>
      </span>
    </label>
  )
}

/**
 * One modal, four views: the list of lists, a create form, an edit form and a
 * delete confirmation. Keeping them in a single dialog avoids stacking native
 * <dialog> elements, which share focus and a labelling id.
 */
export function ListManagerModal({
  open,
  initialView = BROWSE,
  onClose,
}: {
  open: boolean
  initialView?: ListManagerView
  onClose: () => void
}) {
  const { actions } = usePlanner()
  const { lists, activeId } = useLists()
  const counts = useListCounts()
  const currency = useCurrency()
  const toast = useToast()

  const [view, setView] = useState<ListManagerView>(initialView)
  const [name, setName] = useState('')
  const [budget, setBudget] = useState(String(DEFAULT_BUDGET))
  const [copyStarter, setCopyStarter] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({})

  // Opened from the strip you land straight on one list, so saving is done;
  // opened from "Your lists" you came from the list of lists, so go back to it.
  const returnsToBrowse = initialView.kind === 'browse'

  const editing: ShoppingListMeta | undefined =
    view.kind === 'edit' || view.kind === 'delete'
      ? lists.find((list) => list.id === view.listId)
      : undefined

  // Read through a ref so re-arming depends on the dialog opening, not on the
  // lists changing — a save must not bounce the view back to where it started.
  const listsRef = useRef(lists)
  listsRef.current = lists
  const wasOpen = useRef(false)

  // Re-arm on each opening, so it never reopens mid-edit or with stale fields.
  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) return
    wasOpen.current = true
    setView(initialView)
    setErrors({})
    if (initialView.kind === 'edit' || initialView.kind === 'delete') {
      // Opened straight onto one list: the form starts from what it holds now.
      const list = listsRef.current.find((entry) => entry.id === initialView.listId)
      setName(list?.name ?? '')
      setBudget(String(list?.budget ?? DEFAULT_BUDGET))
    } else {
      setName('')
      setBudget(String(DEFAULT_BUDGET))
      setCopyStarter(false)
    }
  }, [open, initialView])

  function openCreate() {
    setName('')
    setBudget(String(DEFAULT_BUDGET))
    setCopyStarter(false)
    setErrors({})
    setView(CREATE)
  }

  function openEdit(list: ShoppingListMeta) {
    setName(list.name)
    setBudget(String(list.budget))
    setErrors({})
    setView({ kind: 'edit', listId: list.id })
  }

  function submitCreate() {
    const result = validate(name, budget)
    setErrors(result.errors)
    if (result.budget === undefined) return
    actions.createList(name.trim(), result.budget, copyStarter)
    toast.success(`“${name.trim()}” created and opened.`)
    onClose()
  }

  function submitEdit() {
    if (!editing) return
    const result = validate(name, budget)
    setErrors(result.errors)
    if (result.budget === undefined) return
    actions.renameList(editing.id, name.trim())
    // Naming the list means editing another one's budget does not drag you
    // out of the list you are currently working in.
    if (result.budget !== editing.budget) actions.setBudget(result.budget, editing.id)
    toast.success('List updated.')
    if (returnsToBrowse) setView(BROWSE)
    else onClose()
  }

  function confirmDelete() {
    if (!editing) return
    const removed = counts[editing.id]?.total ?? 0
    actions.deleteList(editing.id)
    toast.success(
      removed > 0
        ? `“${editing.name}” and its ${removed} item${removed === 1 ? '' : 's'} were deleted.`
        : `“${editing.name}” was deleted.`,
    )
    if (returnsToBrowse) setView(BROWSE)
    else onClose()
  }

  const atLimit = lists.length >= MAX_LISTS
  const onlyList = lists.length <= 1

  const title =
    view.kind === 'create'
      ? 'New list'
      : view.kind === 'edit'
        ? 'Edit list'
        : view.kind === 'delete'
          ? 'Delete this list?'
          : 'Your lists'

  const description =
    view.kind === 'create'
      ? 'Each list keeps its own items and its own budget.'
      : view.kind === 'browse'
        ? 'Separate lists for separate trips — your own, or one you are buying for someone else.'
        : undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        view.kind === 'browse' ? (
          <Button
            fullWidth
            size="lg"
            onClick={openCreate}
            disabled={atLimit}
            title={atLimit ? `You can keep up to ${MAX_LISTS} lists.` : undefined}
          >
            <IconPlus className="size-4" />
            New list
          </Button>
        ) : view.kind === 'delete' ? (
          <div className="flex gap-2">
            <Button size="lg" variant="secondary" className="flex-1" onClick={() => setView(BROWSE)}>
              Keep it
            </Button>
            <Button size="lg" variant="danger" className="flex-1" onClick={confirmDelete}>
              <IconTrash className="size-4" />
              Delete list
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={() => (view.kind === 'create' ? onClose() : setView(BROWSE))}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={view.kind === 'create' ? submitCreate : submitEdit}
            >
              <IconCheck className="size-4" />
              {view.kind === 'create' ? 'Create list' : 'Save'}
            </Button>
          </div>
        )
      }
    >
      {view.kind === 'browse' ? (
        <ul className="space-y-2">
          {lists.map((list) => {
            const count = counts[list.id] ?? { total: 0, purchased: 0 }
            const isActive = list.id === activeId
            return (
              <li
                key={list.id}
                className={cx(
                  'flex items-center gap-2 rounded-2xl border p-2.5 pl-3.5',
                  isActive ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    actions.setActiveList(list.id)
                    onClose()
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-ink">{list.name}</span>
                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-on-brand uppercase">
                        Open
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum mt-0.5 block truncate text-[12.5px] text-ink-muted">
                    {count.purchased}/{count.total} bought · {formatMoney(list.budget, currency)}{' '}
                    budget
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(list)}
                  aria-label={`Edit ${list.name}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                >
                  <IconEdit className="size-4.5" />
                </button>
              </li>
            )
          })}
          {atLimit ? (
            <li className="flex items-start gap-2 px-1 pt-1 text-[12.5px] text-ink-muted">
              <IconAlert className="mt-0.5 size-4 shrink-0" />
              You are at the limit of {MAX_LISTS} lists. Delete one to make room for another.
            </li>
          ) : null}
        </ul>
      ) : view.kind === 'delete' && editing ? (
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-ink-soft">
            “{editing.name}” and the {counts[editing.id]?.total ?? 0} item
            {(counts[editing.id]?.total ?? 0) === 1 ? '' : 's'} on it will be deleted. Your other
            lists are untouched.
          </p>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            This cannot be undone. If you might want the items back, export a backup from Settings
            first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField
            label="List name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setErrors((current) => ({ ...current, name: undefined }))
            }}
            error={errors.name}
            placeholder="e.g. Gifts for Mum"
            autoComplete="off"
            maxLength={MAX_NAME}
          />
          <TextField
            label="Budget for this list"
            required
            inputMode="decimal"
            value={budget}
            onChange={(event) => {
              setBudget(event.target.value)
              setErrors((current) => ({ ...current, budget: undefined }))
            }}
            error={errors.budget}
            prefix={currency}
            hint="Each list is budgeted on its own. You can change this any time."
            placeholder="0"
          />

          {view.kind === 'create' ? (
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-soft">
                Start this list with
              </legend>
              <StartOption
                checked={!copyStarter}
                onChange={() => setCopyStarter(false)}
                title="Nothing yet"
                description="An empty list you fill in yourself."
              />
              <StartOption
                checked={copyStarter}
                onChange={() => setCopyStarter(true)}
                title="A copy of the starter plan"
                description="The same 25 suggested items your first list began with, at their estimated prices."
              />
            </fieldset>
          ) : editing ? (
            <div className="rounded-2xl border border-line bg-surface-muted p-3.5">
              <p className="tnum text-[13px] text-ink-soft">
                {counts[editing.id]?.total ?? 0} item
                {(counts[editing.id]?.total ?? 0) === 1 ? '' : 's'} on this list.
              </p>
              {onlyList ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
                  This is your only list, so it cannot be deleted — there would be nowhere to put a
                  product. Make another list first.
                </p>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => setView({ kind: 'delete', listId: editing.id })}
                >
                  <IconTrash className="size-4" />
                  Delete this list
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
