import { Badge } from '@/components/ui/badge'
import type { ComplaintStatus } from '@/types/complaint'

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  draft: 'مسودة',
  ready: 'جاهزة',
  completed: 'مكتملة',
}

const STATUS_VARIANTS: Record<ComplaintStatus, 'neutral' | 'secondary' | 'primary'> = {
  draft: 'neutral',
  ready: 'secondary',
  completed: 'primary',
}

type ComplaintStatusBadgeProps = {
  status: ComplaintStatus
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}
