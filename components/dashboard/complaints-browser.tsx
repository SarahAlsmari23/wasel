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
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { getDisplayTitle, getComplaintStatusPresentation } from '@/lib/complaints/display'
import { defineCopy } from '@/lib/i18n/config'
import type { ComplaintRecord } from '@/lib/db/complaints'
import { entityDisplayName, getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { formatDate } from '@/lib/utils/format'

type SortOrder = 'newest' | 'oldest'
type StatusFilter = 'all' | 'draft' | 'generated' | 'submitted' | 'completed'

const COPY = defineCopy({
  ar: {
    filters: {
      all: 'كل الحالات',
      draft: 'مسودة',
      generated: 'جاهز للتقديم',
      submitted: 'تم التقديم',
      completed: 'مكتمل',
    } satisfies Record<StatusFilter, string>,
    emptyTitle: 'لا توجد لديك بلاغات محفوظة حتى الآن.',
    emptyBody: 'ابدأ بلاغاً جديداً وسيساعدك واصل في تحديد الجهة المختصة وصياغة البلاغ.',
    start: 'ابدأ بلاغاً جديداً',
    searchPlaceholder: 'ابحث باسم البلاغ أو الجهة الحكومية...',
    searchLabel: 'البحث في البلاغات',
    filterLabel: 'تصفية حسب الحالة',
    sortLabel: 'ترتيب النتائج',
    newest: 'الأحدث أولاً',
    oldest: 'الأقدم أولاً',
    noResults: 'لا توجد نتائج مطابقة.',
    noResultsHint: 'جرّب تعديل كلمات البحث أو تغيير التصفية.',
    created: 'أُنشئ',
    updated: 'آخر تحديث',
    open: 'فتح',
  },
  en: {
    filters: {
      all: 'All statuses',
      draft: 'Draft',
      generated: 'Ready to submit',
      submitted: 'Submitted',
      completed: 'Completed',
    } satisfies Record<StatusFilter, string>,
    emptyTitle: "You don't have any saved complaints yet.",
    emptyBody:
      'Start a new complaint and Wasel will help you identify the responsible authority and draft it.',
    start: 'Start a new complaint',
    searchPlaceholder: 'Search by complaint or authority...',
    searchLabel: 'Search complaints',
    filterLabel: 'Filter by status',
    sortLabel: 'Sort results',
    newest: 'Newest first',
    oldest: 'Oldest first',
    noResults: 'No matching results.',
    noResultsHint: 'Try different search words or another filter.',
    created: 'Created',
    updated: 'Last updated',
    open: 'Open',
  },
})

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
  const copy = useCopy(COPY)
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return complaints
      .filter((complaint) => {
        if (status !== 'all' && statusFilterKey(complaint) !== status) return false
        if (normalizedQuery === '') return true

        const displayTitle = getDisplayTitle(
          { title: complaint.title, complaintSubject: complaint.subject },
          locale,
        )
        return (
          displayTitle.toLowerCase().includes(normalizedQuery) ||
          (complaint.entityName?.toLowerCase().includes(normalizedQuery) ?? false) ||
          entityDisplayName(complaint.entityName, 'en').toLowerCase().includes(normalizedQuery) ||
          complaint.referenceNumber.toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((a, b) => {
        const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [complaints, query, status, sortOrder, locale])

  if (complaints.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={copy.emptyTitle}
        description={copy.emptyBody}
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            {copy.start}
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
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchLabel}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            aria-label={copy.filterLabel}
            className="w-auto shrink-0"
          >
            {(Object.keys(copy.filters) as StatusFilter[]).map((value) => (
              <option key={value} value={value}>
                {copy.filters[value]}
              </option>
            ))}
          </Select>

          <Select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            aria-label={copy.sortLabel}
            className="w-auto shrink-0"
          >
            <option value="newest">{copy.newest}</option>
            <option value="oldest">{copy.oldest}</option>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title={copy.noResults} description={copy.noResultsHint} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((complaint) => {
            const displayTitle = getDisplayTitle(
              { title: complaint.title, complaintSubject: complaint.subject },
              locale,
            )
            const presentation = getComplaintStatusPresentation(
              complaint.status,
              complaint.submittedAt,
              locale,
            )
            const entity = complaint.entityName
              ? getGovernmentEntityByName(complaint.entityName)
              : undefined

            return (
              <Card key={complaint.id} interactive className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <GovernmentLogo iconKey={entity?.iconKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h3
                      dir="auto"
                      className="text-match-parent text-heading text-sm leading-snug font-semibold text-balance"
                    >
                      {displayTitle}
                    </h3>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {entityDisplayName(complaint.entityName, locale)}
                    </p>
                  </div>
                  <Badge variant={presentation.badgeVariant}>
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                    {presentation.label}
                  </Badge>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span
                    dir="ltr"
                    className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 font-medium"
                  >
                    {complaint.referenceNumber}
                  </span>
                  <span>
                    {copy.created}: {formatDate(complaint.createdAt, locale)}
                  </span>
                  <span>
                    {copy.updated}: {formatDate(complaint.updatedAt, locale)}
                  </span>
                </div>

                <div className="border-border mt-auto flex items-center gap-1 border-t pt-3">
                  <Link
                    href={`/dashboard/complaints/${complaint.id}`}
                    className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    {copy.open}
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
