'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ComplaintStatusBadge } from '@/components/complaints/complaint-status-badge'
import type { MockComplaint } from '@/types/complaint'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'الآن'
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'قبل دقيقة'
    if (diffMinutes === 2) return 'قبل دقيقتين'
    return `قبل ${diffMinutes} دقيقة`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    if (diffHours === 1) return 'قبل ساعة'
    if (diffHours === 2) return 'قبل ساعتين'
    return `قبل ${diffHours} ساعات`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'قبل يوم'
  if (diffDays === 2) return 'قبل يومين'
  if (diffDays <= 10) return `قبل ${diffDays} أيام`
  return `قبل ${diffDays} يوماً`
}

type ComplaintListItemProps = {
  complaint: MockComplaint
}

export function ComplaintListItem({ complaint }: ComplaintListItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/complaints/${complaint.id}`

  return (
    <Link
      href={`/complaints/${complaint.id}`}
      className={`flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors ${
        isActive
          ? 'border-foreground/30 bg-foreground/5'
          : 'border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{complaint.title}</p>
        <ComplaintStatusBadge status={complaint.status} />
      </div>
      <p className="text-sm text-black/60 dark:text-white/60">
        {complaint.entityName} · {complaint.categoryName}
      </p>
      <p className="text-xs text-black/40 dark:text-white/40">
        {formatRelativeTime(complaint.updatedAt)}
      </p>
    </Link>
  )
}
