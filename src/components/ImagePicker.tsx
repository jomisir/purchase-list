import { useRef, useState } from 'react'
import type { Category, ProductImage as ProductImageValue } from '@/types'
import { BUILTIN_IMAGE_LIST } from '@/assets/products'
import { fileToStoredImage, ImageError } from '@/lib/image'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/components/ProductImage'
import { IconImage, IconTrash, IconUpload } from '@/components/icons'

/**
 * Upload a photo, or pick one of the bundled illustrations. Uploaded files are
 * downscaled and previewed before the product is saved.
 */
export function ImagePicker({
  value,
  onChange,
  category,
  name,
}: {
  value: ProductImageValue | null
  onChange: (image: ProductImageValue | null) => void
  category: Category
  name: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const stored = await fileToStoredImage(file)
      onChange({ kind: 'data', dataUrl: stored.dataUrl, name: stored.name })
    } catch (cause) {
      setError(
        cause instanceof ImageError
          ? cause.message
          : 'That image could not be processed. Try a different file.',
      )
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Product image</span>

      <div className="flex items-start gap-3">
        <ProductImage
          image={value}
          name={name || 'New product'}
          category={category}
          className="size-24 shrink-0 rounded-2xl border border-image-panel-line"
          imageClassName="p-1.5"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            id="product-image-upload"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <IconUpload className="size-4" />
              {busy ? 'Processing…' : 'Upload image'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowLibrary((open) => !open)}
              aria-expanded={showLibrary}
            >
              <IconImage className="size-4" />
              Built-in artwork
            </Button>
            {value ? (
              <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
                <IconTrash className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Photos are resized to fit and stored on this device only. Built-in artwork is an
            illustration, not a photo of the exact product.
          </p>
          {error ? (
            <p role="alert" className="text-[12.5px] font-medium text-negative">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {showLibrary ? (
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl border border-line bg-surface-muted p-2.5 sm:grid-cols-6">
          {BUILTIN_IMAGE_LIST.map((image) => {
            const selected = value?.kind === 'builtin' && value.key === image.key
            return (
              <button
                key={image.key}
                type="button"
                title={image.label}
                onClick={() => onChange({ kind: 'builtin', key: image.key })}
                className={cx(
                  'aspect-square overflow-hidden rounded-xl border-2 bg-image-panel p-1 transition',
                  selected ? 'border-brand' : 'border-transparent hover:border-line-strong',
                )}
              >
                <img
                  src={image.src}
                  alt={image.label}
                  className="size-full object-contain"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
