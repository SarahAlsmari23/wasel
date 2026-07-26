'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Card } from '@/components/ui/card'
import { RelativeTime } from '@/components/ui/relative-time'
import { ComplaintStatusBadge } from '@/components/ui/status-badge'
import type { MockComplaint } from '@/types/complaint'

type ComplaintCardProps = {
  complaint: MockComplaint
  onDelete: (complaint: MockComplaint) => void
}

export function ComplaintCard({ complaint, onDelete }: ComplaintCardProps) {
  const detailHref = `/dashboard/complaints/${complaint.id}`

  return (
    <Card interactive className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <GovernmentLogo iconKey={complaint.entityIconKey} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="text-heading text-sm leading-snug font-semibold text-balance">
            {complaint.title}
          </h3>
          <p className="text-muted-foreground mt-1 truncate text-xs">{complaint.entityName}</p>
        </div>
        <ComplaintStatusBadge status={complaint.status} />
      </div>

      <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
        {complaint.summary}
      </p>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 font-medium">
          {complaint.categoryName}
        </span>
        <RelativeTime iso={complaint.updatedAt} />
      </div>

      <div className="border-border mt-auto flex items-center gap-1 border-t pt-3">
        <Link
          href={detailHref}
          className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          فتح
        </Link>
        <Link
          href={`${detailHref}?edit=1`}
          className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          تعديل
        </Link>
        <button
          type="button"
          onClick={() => onDelete(complaint)}
          className="text-danger hover:bg-danger/6 mr-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          حذف
        </button>
      </div>
    </Card>
  )
}
