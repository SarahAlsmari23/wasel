'use client'

import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ComplaintListItem } from '@/components/complaints/complaint-list-item'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs } from '@/components/ui/tabs'
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
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في الشكاوى..."
      />

      <Tabs items={TABS} value={activeTab} onChange={(value) => setActiveTab(value as TabValue)} />

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((complaint) => (
            <ComplaintListItem key={complaint.id} complaint={complaint} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="لا توجد نتائج"
          description="لم يتم العثور على شكاوى مطابقة لبحثك."
        />
      )}
    </div>
  )
}
