'use client'

import { useMemo, useState } from 'react'
import { ConversationListItem } from '@/components/conversations/conversation-list-item'
import { EmptyState } from '@/components/empty-state'
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
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في المحادثات..."
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20"
      />

      <div className="flex gap-2">
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
          {filtered.map((conversation) => (
            <ConversationListItem key={conversation.id} conversation={conversation} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد نتائج" description="لم يتم العثور على محادثات مطابقة لبحثك." />
      )}
    </div>
  )
}
