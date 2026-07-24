'use client'

import { MessagesSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConversationListItem } from '@/components/conversations/conversation-list-item'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs } from '@/components/ui/tabs'
import type { ConversationStatus, MockConversation } from '@/types/conversation'

type TabValue = 'all' | ConversationStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'نشطة' },
  { value: 'completed', label: 'مكتملة' },
]

type ConversationListProps = {
  conversations: MockConversation[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim()
    return conversations.filter((conversation) => {
      const matchesTab = activeTab === 'all' || conversation.status === activeTab
      const matchesQuery =
        normalizedQuery === '' ||
        conversation.title.includes(normalizedQuery) ||
        conversation.preview.includes(normalizedQuery)
      return matchesTab && matchesQuery
    })
  }, [conversations, query, activeTab])

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في المحادثات..."
      />

      <Tabs items={TABS} value={activeTab} onChange={(value) => setActiveTab(value as TabValue)} />

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((conversation) => (
            <ConversationListItem key={conversation.id} conversation={conversation} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="لا توجد نتائج"
          description="لم يتم العثور على محادثات مطابقة لبحثك."
        />
      )}
    </div>
  )
}
