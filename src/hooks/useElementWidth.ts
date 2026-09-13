import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Measured width of an element, so a chart can be drawn at real pixel size.
 *
 * Scaling one viewBox to fit would shrink the axis text along with the plot; at
 * phone widths that lands well under a legible size. Rendering 1:1 keeps labels
 * at the size they were designed at.
 */
export function useElementWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect()
    if (!node) return
    setWidth(node.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    observer.current = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(Math.round(entry.contentRect.width))
    })
    observer.current.observe(node)
  }, [])

  useEffect(() => () => observer.current?.disconnect(), [])

  return [ref, width]
}
