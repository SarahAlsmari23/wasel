'use client'

import { BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KnowledgeDocumentListItem } from '@/components/knowledge/knowledge-document-list-item'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs } from '@/components/ui/tabs'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import type { KnowledgeDocumentStatus, MockKnowledgeDocument } from '@/types/knowledge'

type TabValue = 'all' | KnowledgeDocumentStatus

const COPY = defineCopy({
  ar: {
    tabs: [
      { value: 'all' as TabValue, label: 'الكل' },
      { value: 'active' as TabValue, label: 'نشط' },
      { value: 'inactive' as TabValue, label: 'غير نشط' },
    ],
    filter: 'تصفية',
    search: 'ابحث في مستندات المعرفة...',
    noResults: 'لا توجد نتائج',
    noResultsHint: 'لم يتم العثور على مستندات مطابقة لبحثك.',
  },
  en: {
    tabs: [
      { value: 'all' as TabValue, label: 'All' },
      { value: 'active' as TabValue, label: 'Active' },
      { value: 'inactive' as TabValue, label: 'Inactive' },
    ],
    filter: 'Filter',
    search: 'Search knowledge documents...',
    noResults: 'No results',
    noResultsHint: 'No documents match your search.',
  },
})

type KnowledgeDocumentListProps = {
  documents: MockKnowledgeDocument[]
}

export function KnowledgeDocumentList({ documents }: KnowledgeDocumentListProps) {
  const copy = useCopy(COPY)
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
        placeholder={copy.search}
        aria-label={copy.search}
      />

      <Tabs
        items={copy.tabs}
        label={copy.filter}
        value={activeTab}
        onChange={(value) => setActiveTab(value as TabValue)}
      />

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((document) => (
            <KnowledgeDocumentListItem key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title={copy.noResults} description={copy.noResultsHint} />
      )}
    </div>
  )
}
