'use client'

import { useMemo, useState } from 'react'
import { ComplaintListItem } from '@/components/complaints/complaint-list-item'
import { EmptyState } from '@/components/empty-state'
import type { ComplaintStatus, MockComplaint } from '@/types/complaint'

type TabValue = 'all' | ComplaintStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'ready', label: 'جاهزة' },
  { value: 'completed', label: 'مكتملة' },
]

type ComplaintListProps = {
  complaints: MockComplaint[]
}

export function ComplaintList({ complaints }: ComplaintListProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim()
    return complaints.filter((complaint) => {
      const matchesTab = activeTab === 'all' || complaint.status === activeTab
      const matchesQuery =
        normalizedQuery === '' ||
        complaint.title.includes(normalizedQuery) ||
        complaint.entityName.includes(normalizedQuery) ||
        complaint.categoryName.includes(normalizedQuery)
      return matchesTab && matchesQuery
    })
  }, [complaints, query, activeTab])

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في الشكاوى..."
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.value
                ? 'bg-foreground text-background'
                : 'bg-black/5 dark:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((complaint) => (
            <ComplaintListItem key={complaint.id} complaint={complaint} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد نتائج" description="لم يتم العثور على شكاوى مطابقة لبحثك." />
      )}
    </div>
  )
}
