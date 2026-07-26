'use client'

import { FileText, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ComplaintCard } from '@/components/dashboard/complaint-card'
import { Button, buttonClasses } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { COMPLAINT_STATUS_LABELS } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import type { ComplaintStatus, MockComplaint } from '@/types/complaint'

type SortOrder = 'newest' | 'oldest'
type DateRange = 'all' | 'week' | 'month' | 'quarter'

const DATE_RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  week: 7,
  month: 30,
  quarter: 90,
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'كل التواريخ',
  week: 'آخر أسبوع',
  month: 'آخر شهر',
  quarter: 'آخر ثلاثة أشهر',
}

type ComplaintsBrowserProps = {
  complaints: MockComplaint[]
}

export function ComplaintsBrowser({ complaints }: ComplaintsBrowserProps) {
  const { showToast } = useToast()

  // Deletions are local to the session — this phase has no persistence.
  const [items, setItems] = useState(complaints)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MockComplaint | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(complaints.map((complaint) => complaint.categoryName))).sort(),
    [complaints],
  )

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const cutoff =
      dateRange === 'all' ? null : Date.now() - DATE_RANGE_DAYS[dateRange] * 24 * 60 * 60 * 1000

    return items
      .filter((complaint) => {
        if (status !== 'all' && complaint.status !== status) return false
        if (category !== 'all' && complaint.categoryName !== category) return false
        if (cutoff !== null && new Date(complaint.updatedAt).getTime() < cutoff) return false
        if (normalizedQuery === '') return true

        // Search covers complaint name and government entity (Phase 3).
        return (
          complaint.title.toLowerCase().includes(normalizedQuery) ||
          complaint.entityName.toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((a, b) => {
        const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        return sortOrder === 'newest' ? diff : -diff
      })
  }, [items, query, status, category, dateRange, sortOrder])

  const hasActiveFilters = status !== 'all' || category !== 'all' || dateRange !== 'all'

  function handleConfirmDelete() {
    if (!pendingDelete) return
    setItems((current) => current.filter((complaint) => complaint.id !== pendingDelete.id))
    setPendingDelete(null)
    showToast('تم حذف البلاغ.')
  }

  function handleResetFilters() {
    setStatus('all')
    setCategory('all')
    setDateRange('all')
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
          <Button
            type="button"
            variant={hasActiveFilters ? 'subtle' : 'outline'}
            onClick={() => setAreFiltersOpen((open) => !open)}
            aria-expanded={areFiltersOpen}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            تصفية
          </Button>

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

      {areFiltersOpen ? (
        <div className="bg-surface border-border animate-scale-in grid gap-4 rounded-2xl border p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-foreground text-xs font-medium">الحالة</span>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as ComplaintStatus | 'all')}
            >
              <option value="all">كل الحالات</option>
              {(Object.keys(COMPLAINT_STATUS_LABELS) as ComplaintStatus[]).map((value) => (
                <option key={value} value={value}>
                  {COMPLAINT_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-foreground text-xs font-medium">التصنيف</span>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">كل التصنيفات</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-foreground text-xs font-medium">التاريخ</span>
            <Select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
            >
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((value) => (
                <option key={value} value={value}>
                  {DATE_RANGE_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="justify-self-start sm:col-span-3"
            >
              إعادة تعيين التصفية
            </Button>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="ليس لديك أي بلاغات حتى الآن."
            description="ابدأ بلاغاً جديداً وسيساعدك واصل في تحديد الجهة المختصة وصياغة البلاغ."
            action={
              <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
                ابدأ بلاغاً جديداً
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="لا توجد نتائج مطابقة."
            description="جرّب تعديل كلمات البحث أو إعادة تعيين خيارات التصفية."
          />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="حذف البلاغ"
        description={
          pendingDelete
            ? `سيتم حذف «${pendingDelete.title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              className="w-full sm:flex-1"
            >
              حذف
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              className="w-full sm:flex-1"
            >
              إلغاء
            </Button>
          </>
        }
      />
    </div>
  )
}
