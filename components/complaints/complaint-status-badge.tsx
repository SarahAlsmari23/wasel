import type { ComplaintStatus } from '@/types/complaint'

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  draft: 'مسودة',
  ready: 'جاهزة',
  completed: 'مكتملة',
}

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  draft: 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60',
  ready: 'bg-amber-600/10 text-amber-700 dark:text-amber-400',
  completed: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
}

type ComplaintStatusBadgeProps = {
  status: ComplaintStatus
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
