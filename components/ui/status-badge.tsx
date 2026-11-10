import { Badge } from '@/components/ui/badge'
import type { ComplaintStatus } from '@/types/complaint'
import type { ConversationStatus } from '@/types/conversation'

const COMPLAINT_STATUS_LABELS_BY_LOCALE: Record<'ar' | 'en', Record<ComplaintStatus, string>> = {
  ar: { draft: 'مسودة', ready: 'جاهزة للتقديم', submitted: 'تم التقديم', completed: 'مكتملة' },
  en: { draft: 'Draft', ready: 'Ready to submit', submitted: 'Submitted', completed: 'Completed' },
}
const COMPLAINT_STATUS_LABELS = COMPLAINT_STATUS_LABELS_BY_LOCALE.ar
const UNKNOWN = { ar: 'غير معروفة', en: 'Unknown' } as const

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
export function ComplaintStatusBadge({
  status,
  locale = 'ar',
}: {
  status: ComplaintStatus
  locale?: 'ar' | 'en'
}) {
  const label = COMPLAINT_STATUS_LABELS_BY_LOCALE[locale][status]
  const variant = COMPLAINT_STATUS_VARIANTS[status]

  if (!label) {
    return <Badge variant="neutral">{String(status || UNKNOWN[locale])}</Badge>
  }

  return (
    <Badge variant={variant}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

const CONVERSATION_STATUS_LABELS: Record<'ar' | 'en', Record<ConversationStatus, string>> = {
  ar: { active: 'نشطة', completed: 'مكتملة' },
  en: { active: 'Active', completed: 'Completed' },
}

export function ConversationStatusBadge({
  status,
  locale = 'ar',
}: {
  status: ConversationStatus
  locale?: 'ar' | 'en'
}) {
  const label = CONVERSATION_STATUS_LABELS[locale][status]

  if (!label) {
    return <Badge variant="neutral">{String(status || UNKNOWN[locale])}</Badge>
  }

  return (
    <Badge variant={status === 'active' ? 'ready' : 'completed'}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}

export { COMPLAINT_STATUS_LABELS }
