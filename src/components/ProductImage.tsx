import { useEffect, useState } from 'react'
import type { Category, ProductImage as ProductImageValue } from '@/types'
import { builtinImage } from '@/assets/products'
import { cx } from '@/lib/cx'

/** Simple category glyphs used when a product has no usable picture. */
const CATEGORY_GLYPH: Record<Category, string> = {
  Electronics: 'M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Zm3 13.5h4',
  Shoes: 'M3 16.5c0-3 1.5-4.5 3-6l2-3 3 2 5 3.5 5 1v2.5H3Z',
  Clothing: 'M9 4 5 6l1 4 2-.7V20h8V9.3l2 .7 1-4-4-2a3 3 0 0 1-6 0Z',
  Perfume: 'M10 3h4v3h-4Zm-2 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z',
  Watches: 'M9 4h6l-.6 4M9 20h6l-.6-4M12 8.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  Bags: 'M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Zm4 0V6a3 3 0 0 1 6 0v2',
  Filming: 'M3 7.5h11v9H3Zm11 3 6-3v9l-6-3',
  Accessories: 'M4 12a4 4 0 1 1 8 0 4 4 0 1 1 8 0M12 12h0',
  Room: 'M6 4h12l-1.5 9H7.5Zm6 9v7M8 20h8',
  Skateboards: 'M3 10h18M6 14a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm9 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z',
  'Skincare & Hygiene': 'M9 3h6v3H9Zm-1 4h8l1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z',
  'Water Bottles': 'M10 2h4v3h-4ZM8 7h8v12a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3Z',
  Other: 'M12 3.5 20 8v8l-8 4.5L4 16V8Z',
}

export function ImagePlaceholder({
  category,
  className,
}: {
  category: Category
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex size-full flex-col items-center justify-center gap-1.5 text-image-panel-ink',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-1/3 max-h-14 min-h-7 opacity-70"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={CATEGORY_GLYPH[category] ?? CATEGORY_GLYPH.Other} />
      </svg>
      <span className="px-2 text-center text-[10px] font-semibold tracking-wide uppercase">
        No image
      </span>
    </div>
  )
}

export function resolveImageSrc(image: ProductImageValue | null): string | null {
  if (!image) return null
  if (image.kind === 'builtin') return builtinImage(image.key)?.src ?? null
  if (image.kind === 'data') return image.dataUrl
  return image.url
}

/**
 * Renders a product picture at a fixed aspect ratio without ever stretching it:
 * `object-contain` keeps the original proportions and the panel fills the rest.
 * Anything that fails to load falls back to a category placeholder.
 */
export function ProductImage({
  image,
  name,
  category,
  className,
  imageClassName,
  showFidelityNote = false,
  noteSize = 'compact',
}: {
  image: ProductImageValue | null
  name: string
  category: Category
  className?: string
  imageClassName?: string
  /** Marks bundled artwork so it is never mistaken for a product photo. */
  showFidelityNote?: boolean
  noteSize?: 'compact' | 'full'
}) {
  const [failed, setFailed] = useState(false)
  const src = resolveImageSrc(image)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const builtin = image?.kind === 'builtin' ? builtinImage(image.key) : undefined
  const alt =
    builtin?.fidelity === 'representative'
      ? `Illustration representing ${name}`
      : builtin
        ? `Illustration of ${name}`
        : name
  const fidelityLabel =
    builtin?.fidelity === 'representative'
      ? 'Category artwork, not a photo of the exact product'
      : 'Illustration, not a photo of the exact product'

  return (
    <div
      className={cx(
        'relative isolate overflow-hidden bg-image-panel',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cx('size-full object-contain', imageClassName)}
        />
      ) : (
        <ImagePlaceholder category={category} />
      )}

      {showFidelityNote && builtin && src && !failed ? (
        noteSize === 'full' ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90 uppercase">
            {builtin.fidelity === 'representative' ? 'Category artwork' : 'Illustration'}
          </span>
        ) : (
          <span
            className="absolute bottom-1 left-1 grid size-4.5 place-items-center rounded-full bg-black/35 text-white/90"
            title={fidelityLabel}
          >
            <span className="sr-only">{fidelityLabel}</span>
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2.2-.9 2.2-2 0-1.5-1.3-1.8-1.3-2.8 0-.8.7-1.4 1.6-1.4h1.4A4.6 4.6 0 0 0 20.5 10c0-3.6-3.8-6.5-8.5-6.5Z" />
              <circle cx="8" cy="11" r="1" fill="currentColor" />
              <circle cx="12" cy="8" r="1" fill="currentColor" />
              <circle cx="16" cy="11" r="1" fill="currentColor" />
            </svg>
          </span>
        )
      ) : null}
    </div>
  )
}
