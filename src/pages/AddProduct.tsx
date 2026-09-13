import { useNavigate } from 'react-router-dom'
import { useLists, usePlanner } from '@/context/plannerContext'
import { useToast } from '@/components/ui/Toast'
import { ProductForm } from '@/components/ProductForm'
import { Card } from '@/components/ui/Card'
import { IconInfo } from '@/components/icons'

export function AddProduct() {
  const { actions } = usePlanner()
  const { lists, activeId } = useLists()
  const toast = useToast()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink lg:text-[26px]">
          Add Product
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Found something better while shopping? Add it and it behaves exactly like a planned item.
        </p>
      </header>

      <Card className="flex items-start gap-3 border-brand/25 bg-brand-soft/40 p-4">
        <IconInfo className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Anything you add here counts towards your budget, appears in the shopping list and price
          tracker, and can be edited or deleted later.
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <ProductForm
          submitLabel="Add product"
          onSubmit={(draft, values) => {
            const id = actions.addProduct(draft)
            // New products land on the open list; a different one was picked
            // deliberately, so move it rather than switching the whole app over.
            const target = lists.find((list) => list.id === values.listId)
            if (target && target.id !== activeId) {
              actions.moveProduct(id, target.id)
              toast.success(`${draft.name} added to “${target.name}”.`)
            } else {
              toast.success(`${draft.name} added to your plan.`)
            }
            navigate('/list')
          }}
          onCancel={() => navigate(-1)}
        />
      </Card>
    </div>
  )
}
