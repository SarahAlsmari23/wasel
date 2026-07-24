import type { ConversationStatus } from '@/types/conversation'

const STATUS_LABELS: Record<ConversationStatus, string> = {
  active: 'نشطة',
  completed: 'مكتملة',
}

const STATUS_STYLES: Record<ConversationStatus, string> = {
  active: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  completed: 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60',
}

type ConversationStatusBadgeProps = {
  status: ConversationStatus
}

export function ConversationStatusBadge({ status }: ConversationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
