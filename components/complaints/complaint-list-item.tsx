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
      className={`bg-surface flex flex-col gap-1.5 rounded-xl border px-4 py-3.5 shadow-sm transition-all hover:shadow-md ${
        isActive ? 'border-primary/40' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{complaint.title}</p>
        <ComplaintStatusBadge status={complaint.status} />
      </div>
      <p className="text-sm text-gray-600">
        {complaint.entityName} · {complaint.categoryName}
      </p>
      <p className="text-xs text-gray-400">{formatRelativeTime(complaint.updatedAt)}</p>
    </Link>
  )
}
