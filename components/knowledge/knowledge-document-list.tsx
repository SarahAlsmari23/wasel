'use client'

import { BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KnowledgeDocumentListItem } from '@/components/knowledge/knowledge-document-list-item'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs } from '@/components/ui/tabs'
import type { KnowledgeDocumentStatus, MockKnowledgeDocument } from '@/types/knowledge'

type TabValue = 'all' | KnowledgeDocumentStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
]

type KnowledgeDocumentListProps = {
  documents: MockKnowledgeDocument[]
}

export function KnowledgeDocumentList({ documents }: KnowledgeDocumentListProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim()
    return documents.filter((document) => {
      const matchesTab = activeTab === 'all' || document.status === activeTab
      const matchesQuery =
        normalizedQuery === '' ||
        document.title.includes(normalizedQuery) ||
        document.entity.includes(normalizedQuery)
      return matchesTab && matchesQuery
    })
  }, [documents, query, activeTab])

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في مستندات المعرفة..."
      />

      <Tabs items={TABS} value={activeTab} onChange={(value) => setActiveTab(value as TabValue)} />

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((document) => (
            <KnowledgeDocumentListItem key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="لا توجد نتائج"
          description="لم يتم العثور على مستندات مطابقة لبحثك."
        />
      )}
    </div>
  )
}
