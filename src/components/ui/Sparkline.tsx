import { useId } from 'react'
import type { PriceRecord } from '@/types'
import { formatMoney } from '@/lib/money'
import { formatShortDate } from '@/lib/date'
import { cx } from '@/lib/cx'

/**
 * Compact price-history chart. Purely presentational — it draws exactly the
 * records it is given, nothing is interpolated or invented.
 */
export function Sparkline({
  records,
  target,
  height = 96,
  className,
}: {
  records: PriceRecord[]
  target?: number | null
  height?: number
  className?: string
}) {
  const gradientId = useId()
  if (records.length === 0) return null

  const width = 300
  const padY = 14
  const prices = records.map((record) => record.price)
  const candidates = target != null ? [...prices, target] : prices
  const min = Math.min(...candidates)
  const max = Math.max(...candidates)
  const span = max - min || Math.max(max * 0.1, 1)
  const low = min - span * 0.15
  const high = max + span * 0.15

  const x = (index: number) =>
    records.length === 1 ? width / 2 : (index / (records.length - 1)) * (width - 16) + 8
  const y = (price: number) => padY + (1 - (price - low) / (high - low)) * (height - padY * 2)

  const points = records.map((record, index) => ({
    cx: x(index),
    cy: y(record.price),
    record,
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.cx} ${point.cy}`).join(' ')
  const area = `${line} L${points[points.length - 1].cx} ${height} L${points[0].cx} ${height} Z`
  const lowestPrice = Math.min(...prices)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cx('w-full', className)}
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={`Price history: ${records
        .map((record) => `${formatShortDate(record.date)} ${formatMoney(record.price)}`)
        .join(', ')}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {target != null ? (
        <g>
          <line
            x1="0"
            x2={width}
            y1={y(target)}
            y2={y(target)}
            stroke="var(--gold)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}

      {records.length > 1 ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      {records.length > 1 ? (
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {points.map((point) => (
        <circle
          key={point.record.id}
          cx={point.cx}
          cy={point.cy}
          r={point.record.price === lowestPrice ? 5 : 3.5}
          fill={point.record.price === lowestPrice ? 'var(--positive)' : 'var(--brand)'}
          stroke="var(--surface)"
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}
