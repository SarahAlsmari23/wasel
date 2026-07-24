import { Badge } from '@/components/ui/badge'
import type { ConversationStatus } from '@/types/conversation'

const STATUS_LABELS: Record<ConversationStatus, string> = {
  active: 'نشطة',
  completed: 'مكتملة',
}

const STATUS_VARIANTS: Record<ConversationStatus, 'primary' | 'neutral'> = {
  active: 'primary',
  completed: 'neutral',
}

type ConversationStatusBadgeProps = {
  status: ConversationStatus
}

export function ConversationStatusBadge({ status }: ConversationStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}
