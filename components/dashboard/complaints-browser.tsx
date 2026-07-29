'use client'

import { FileText } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/field'
import { SearchInput } from '@/components/ui/search-input'
import { getDisplayTitle, getComplaintStatusPresentation } from '@/lib/complaints/display'
import type { ComplaintRecord } from '@/lib/db/complaints'
import { getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { formatDate } from '@/lib/utils/format'

type SortOrder = 'newest' | 'oldest'
type StatusFilter = 'all' | 'draft' | 'generated' | 'submitted' | 'completed'

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'كل الحالات',
  draft: 'مسودة',
  generated: 'تم الإنشاء',
  submitted: 'تم التقديم',
  completed: 'مكتمل',
}

function statusFilterKey(complaint: ComplaintRecord): Exclude<StatusFilter, 'all'> {
  if (complaint.status === 'completed') return 'completed'
  if (complaint.status === 'generated') return complaint.submittedAt ? 'submitted' : 'generated'
  return 'draft'
}

type ComplaintsBrowserProps = {
  complaints: ComplaintRecord[]
}

/**
 * Real, database-backed complaints only (Phase 6.5) — no mock data, no
 * delete action (no secure delete helper exists yet), no category filter
 * (real complaints have no category display name yet).
 */
export function ComplaintsBrowser({ complaints }: ComplaintsBrowserProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return complaints
      .filter((complaint) => {
        if (status !== 'all' && statusFilterKey(complaint) !== status) return false
        if (normalizedQuery === '') return true

        const displayTitle = getDisplayTitle({
          title: complaint.title,
          complaintSubject: complaint.subject,
        })
        return (
          displayTitle.toLowerCase().includes(normalizedQuery) ||
          (complaint.entityName?.toLowerCase().includes(normalizedQuery) ?? false)
        )
      })
      .sort((a, b) => {
        const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [complaints, query, status, sortOrder])

  if (complaints.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="لا توجد لديك بلاغات محفوظة حتى الآن."
        description="ابدأ بلاغاً جديداً وسيساعدك واصل في تحديد الجهة المختصة وصياغة البلاغ."
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            ابدأ بلاغاً جديداً
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم البلاغ أو الجهة الحكومية..."
            aria-label="البحث في البلاغات"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            aria-label="تصفية حسب الحالة"
            className="w-auto shrink-0"
          >
            {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((value) => (
              <option key={value} value={value}>
                {STATUS_FILTER_LABELS[value]}
              </option>
            ))}
          </Select>

          <Select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            aria-label="ترتيب النتائج"
            className="w-auto shrink-0"
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد نتائج مطابقة."
          description="جرّب تعديل كلمات البحث أو تغيير التصفية."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((complaint) => {
            const displayTitle = getDisplayTitle({
              title: complaint.title,
              complaintSubject: complaint.subject,
            })
            const presentation = getComplaintStatusPresentation(
              complaint.status,
              complaint.submittedAt,
            )
            const entity = complaint.entityName
              ? getGovernmentEntityByName(complaint.entityName)
              : undefined

            return (
              <Card key={complaint.id} interactive className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <GovernmentLogo iconKey={entity?.iconKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-heading text-sm leading-snug font-semibold text-balance">
                      {displayTitle}
                    </h3>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {complaint.entityName ?? ''}
                    </p>
                  </div>
                  <Badge variant={presentation.badgeVariant}>
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                    {presentation.label}
                  </Badge>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 font-medium">
                    {complaint.referenceNumber}
                  </span>
                  <span>أُنشئ: {formatDate(complaint.createdAt)}</span>
                  <span>آخر تحديث: {formatDate(complaint.updatedAt)}</span>
                </div>

                <div className="border-border mt-auto flex items-center gap-1 border-t pt-3">
                  <Link
                    href={`/dashboard/complaints/${complaint.id}`}
                    className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    فتح
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
