import type { Product } from '@/types'
import { DEAL_LABELS, dealStatus } from '@/lib/calc'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { IconAlert, IconSparkle, IconTrendDown } from '@/components/icons'

const TONES: Record<string, BadgeTone> = {
  great: 'gold',
  good: 'positive',
  at: 'brand',
  above: 'negative',
}

/**
 * Deal verdict for a product. Renders nothing unless there is both a target
 * and an observed price — the app never guesses at a deal.
 */
export function DealBadge({ product, className }: { product: Product; className?: string }) {
  const status = dealStatus(product)
  if (!status) return null
  const icon =
    status === 'great' ? (
      <IconSparkle className="size-3.5" />
    ) : status === 'above' ? (
      <IconAlert className="size-3.5" />
    ) : status === 'good' ? (
      <IconTrendDown className="size-3.5" />
    ) : null
  return (
    <Badge tone={TONES[status]} icon={icon} className={className}>
      {DEAL_LABELS[status].toUpperCase()}
    </Badge>
  )
}
