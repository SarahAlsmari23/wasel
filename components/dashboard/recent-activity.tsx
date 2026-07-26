import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { GovernmentLogo } from '@/components/government/government-logo'
import { EmptyState } from '@/components/ui/empty-state'
import { RelativeTime } from '@/components/ui/relative-time'
import { ComplaintStatusBadge } from '@/components/ui/status-badge'
import type { MockComplaint } from '@/types/complaint'

type RecentActivityProps = {
  complaints: MockComplaint[]
}

export function RecentActivity({ complaints }: RecentActivityProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading text-sm font-semibold">آخر النشاطات</h2>
        <Link
          href="/dashboard/complaints"
          className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
        >
          عرض الكل
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {complaints.length === 0 ? (
        <EmptyState title="لا يوجد نشاط بعد." description="ستظهر هنا آخر بلاغاتك وتحديثاتها." />
      ) : (
        <ul className="bg-surface border-border shadow-soft divide-border divide-y overflow-hidden rounded-2xl border">
          {complaints.map((complaint) => (
            <li key={complaint.id}>
              <Link
                href={`/dashboard/complaints/${complaint.id}`}
                className="hover:bg-primary/4 flex items-center gap-4 p-4 transition-colors"
              >
                <GovernmentLogo iconKey={complaint.entityIconKey} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">{complaint.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {complaint.entityName} · <RelativeTime iso={complaint.updatedAt} />
                  </p>
                </div>

                <ComplaintStatusBadge status={complaint.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
