import { Badge } from '@/components/ui/badge'
import type { ComplaintStatus } from '@/types/complaint'
import type { ConversationStatus } from '@/types/conversation'

const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  draft: 'مسودة',
  ready: 'جاهزة للتقديم',
  submitted: 'تم التقديم',
  completed: 'مكتملة',
}

const COMPLAINT_STATUS_VARIANTS: Record<ComplaintStatus, ComplaintStatus> = {
  draft: 'draft',
  ready: 'ready',
  submitted: 'submitted',
  completed: 'completed',
}

/**
 * `status` is typed, but these badges also render data that originated outside
 * the type system (saved records, future API responses). An unknown value
 * falls back to a neutral badge showing the raw string rather than rendering
 * an empty pill with no styling.
 */
export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const label = COMPLAINT_STATUS_LABELS[status]
  const variant = COMPLAINT_STATUS_VARIANTS[status]

  if (!label) {
    return <Badge variant="neutral">{String(status || 'غير معروفة')}</Badge>
  }

  return (
    <Badge variant={variant}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  active: 'نشطة',
  completed: 'مكتملة',
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const label = CONVERSATION_STATUS_LABELS[status]

  if (!label) {
    return <Badge variant="neutral">{String(status || 'غير معروفة')}</Badge>
  }

  return (
    <Badge variant={status === 'active' ? 'ready' : 'completed'}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

export { COMPLAINT_STATUS_LABELS }
