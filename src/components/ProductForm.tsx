import { useMemo, useState } from 'react'
import type { Category, Product, ProductImage as ProductImageValue } from '@/types'
import { CATEGORIES } from '@/types'
import { parsePrice } from '@/lib/money'
import { validateUrl } from '@/lib/url'
import type { ProductDraft } from '@/context/plannerReducer'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ImagePicker } from '@/components/ImagePicker'

export interface ProductFormValues {
  name: string
  price: string
  quantity: string
  category: Category
  brand: string
  store: string
  targetPrice: string
  currentPrice: string
  actualPrice: string
  productUrl: string
  notes: string
  image: ProductImageValue | null
  purchased: boolean
}

type Errors = Partial<Record<keyof ProductFormValues, string>>

function emptyValues(): ProductFormValues {
  return {
    name: '',
    price: '',
    quantity: '1',
    category: 'Electronics',
    brand: '',
    store: '',
    targetPrice: '',
    currentPrice: '',
    actualPrice: '',
    productUrl: '',
    notes: '',
    image: null,
    purchased: false,
  }
}

function valuesFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    price: String(product.estimatedPrice),
    quantity: String(product.quantity),
    category: product.category,
    brand: product.brand ?? '',
    store: product.store ?? '',
    targetPrice: product.targetPrice == null ? '' : String(product.targetPrice),
    currentPrice: product.currentPrice == null ? '' : String(product.currentPrice),
    actualPrice: product.actualPrice == null ? '' : String(product.actualPrice),
    productUrl: product.productUrl ?? '',
    notes: product.notes ?? '',
    image: product.image,
    purchased: product.purchased,
  }
}

/** Shared price validation: blank is allowed unless `required`. */
function validatePrice(
  raw: string,
  label: string,
  required: boolean,
): { value: number | null; error?: string } {
  const parsed = parsePrice(raw)
  if (parsed === null) {
    return required ? { value: null, error: `${label} is required.` } : { value: null }
  }
  if (Number.isNaN(parsed)) return { value: null, error: `${label} must be a number.` }
  if (parsed < 0) return { value: null, error: `${label} cannot be negative.` }
  if (parsed > 10_000_000) return { value: null, error: `${label} is unrealistically large.` }
  return { value: parsed }
}

export function buildDraft(values: ProductFormValues): {
  draft?: ProductDraft
  errors: Errors
} {
  const errors: Errors = {}

  const name = values.name.trim()
  if (name === '') errors.name = 'Give the product a name.'
  else if (name.length > 120) errors.name = 'Keep the name under 120 characters.'

  const price = validatePrice(values.price, 'Price', true)
  if (price.error) errors.price = price.error

  const quantityParsed = parsePrice(values.quantity)
  let quantity = 1
  if (quantityParsed === null) errors.quantity = 'Quantity is required.'
  else if (Number.isNaN(quantityParsed)) errors.quantity = 'Quantity must be a number.'
  else if (!Number.isInteger(quantityParsed)) errors.quantity = 'Quantity must be a whole number.'
  else if (quantityParsed < 1) errors.quantity = 'Quantity must be at least 1.'
  else if (quantityParsed > 999) errors.quantity = 'Quantity must be 999 or fewer.'
  else quantity = quantityParsed

  const target = validatePrice(values.targetPrice, 'Target price', false)
  if (target.error) errors.targetPrice = target.error
  const current = validatePrice(values.currentPrice, 'Current price', false)
  if (current.error) errors.currentPrice = current.error
  const actual = validatePrice(values.actualPrice, 'Actual price', false)
  if (actual.error) errors.actualPrice = actual.error

  const url = validateUrl(values.productUrl)
  if (url.error) errors.productUrl = url.error

  if (Object.keys(errors).length > 0) return { errors }

  const estimatedPrice = price.value ?? 0
  const purchased = values.purchased && actual.value != null

  return {
    errors,
    draft: {
      name,
      category: values.category,
      brand: values.brand.trim() || undefined,
      image: values.image,
      quantity,
      // Falling back to the estimate keeps deal detection meaningful.
      targetPrice: target.value ?? estimatedPrice,
      targetMin: null,
      targetMax: null,
      estimatedPrice,
      currentPrice: current.value,
      actualPrice: actual.value,
      store: values.store.trim() || undefined,
      productUrl: url.value,
      notes: values.notes.trim() || undefined,
      purchased,
      purchasedAt: purchased ? new Date().toISOString() : null,
      alternativeToId: null,
    },
  }
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  submitLabel,
  extraActions,
}: {
  product?: Product
  onSubmit: (draft: ProductDraft, values: ProductFormValues) => void
  onCancel?: () => void
  submitLabel?: string
  extraActions?: React.ReactNode
}) {
  const [values, setValues] = useState<ProductFormValues>(() =>
    product ? valuesFromProduct(product) : emptyValues(),
  )
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    if (submitted) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const lineTotalHint = useMemo(() => {
    const price = parsePrice(values.price)
    const quantity = parsePrice(values.quantity)
    if (price == null || Number.isNaN(price) || quantity == null || Number.isNaN(quantity)) {
      return undefined
    }
    if (quantity <= 1) return undefined
    return `${quantity} × AED ${price} = AED ${Math.round(price * quantity * 100) / 100}`
  }, [values.price, values.quantity])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const result = buildDraft(values)
    setErrors(result.errors)
    if (!result.draft) {
      const firstError = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstError?.focus()
      return
    }
    onSubmit(result.draft, values)
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <ImagePicker
        value={values.image}
        onChange={(image) => set('image', image)}
        category={values.category}
        name={values.name}
      />

      <TextField
        label="Product name"
        required
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={errors.name}
        placeholder="e.g. Anker 65W GaN charger"
        autoComplete="off"
        maxLength={140}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Price"
          required
          inputMode="decimal"
          prefix="AED"
          value={values.price}
          onChange={(event) => set('price', event.target.value)}
          error={errors.price}
          hint="Your planning estimate, per unit."
          placeholder="0"
        />
        <TextField
          label="Quantity"
          required
          inputMode="numeric"
          value={values.quantity}
          onChange={(event) => set('quantity', event.target.value)}
          error={errors.quantity}
          hint={lineTotalHint}
          placeholder="1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Category"
          value={values.category}
          onChange={(event) => set('category', event.target.value as Category)}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Brand"
          value={values.brand}
          onChange={(event) => set('brand', event.target.value)}
          placeholder="Optional"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Store"
          value={values.store}
          onChange={(event) => set('store', event.target.value)}
          placeholder="e.g. Dragon Mart"
          autoComplete="off"
        />
        <TextField
          label="Target price"
          inputMode="decimal"
          prefix="AED"
          value={values.targetPrice}
          onChange={(event) => set('targetPrice', event.target.value)}
          error={errors.targetPrice}
          hint="Defaults to the price above."
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Current price seen"
          inputMode="decimal"
          prefix="AED"
          value={values.currentPrice}
          onChange={(event) => set('currentPrice', event.target.value)}
          error={errors.currentPrice}
          hint="Only if you have actually seen it."
          placeholder="Optional"
        />
        <TextField
          label="Price paid"
          inputMode="decimal"
          prefix="AED"
          value={values.actualPrice}
          onChange={(event) => {
            set('actualPrice', event.target.value)
            if (event.target.value.trim() !== '') set('purchased', true)
          }}
          error={errors.actualPrice}
          hint="Fills in when you check the item off."
          placeholder="Optional"
        />
      </div>

      <TextField
        label="Product link"
        type="url"
        value={values.productUrl}
        onChange={(event) => set('productUrl', event.target.value)}
        error={errors.productUrl}
        placeholder="https://…"
        autoComplete="off"
        inputMode="url"
      />

      <TextAreaField
        label="Notes"
        value={values.notes}
        onChange={(event) => set('notes', event.target.value)}
        placeholder="Things to check, sizes, colours…"
        rows={4}
      />

      {submitted && errorCount > 0 ? (
        <p role="alert" className="rounded-xl bg-negative-soft px-3.5 py-2.5 text-[13px] font-medium text-negative">
          {errorCount === 1
            ? 'One field needs fixing before this can be saved.'
            : `${errorCount} fields need fixing before this can be saved.`}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" size="lg" className="flex-1 sm:flex-none">
          {submitLabel ?? 'Add product'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {extraActions}
      </div>
    </form>
  )
}
