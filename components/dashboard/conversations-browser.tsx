'use client'

import { ArrowLeft, MessagesSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { RelativeTime } from '@/components/ui/relative-time'
import { SearchInput } from '@/components/ui/search-input'
import { ConversationStatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import type { MockConversation } from '@/types/conversation'

type ConversationsBrowserProps = {
  conversations: MockConversation[]
}

export function ConversationsBrowser({ conversations }: ConversationsBrowserProps) {
  const { showToast } = useToast()
  // Deletions are local to the session — this phase has no persistence.
  const [items, setItems] = useState(conversations)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MockConversation | null>(null)

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return items
      .filter((conversation) => {
        if (normalized === '') return true
        return (
          conversation.title.toLowerCase().includes(normalized) ||
          conversation.preview.toLowerCase().includes(normalized) ||
          (conversation.entityName?.toLowerCase().includes(normalized) ?? false)
        )
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [items, query])

  function handleConfirmDelete() {
    if (!pendingDelete) return
    setItems((current) => current.filter((item) => item.id !== pendingDelete.id))
    setPendingDelete(null)
    showToast('تم حذف المحادثة.')
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="لا توجد محادثات محفوظة."
        description="ابدأ أول محادثة مع واصل واسأله عن أي شيء يخص بلاغك."
        action={
          <Link href="/wasal?mode=assistant" className={buttonClasses('primary', 'md')}>
            ابدأ محادثة جديدة
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث في المحادثات..."
        aria-label="البحث في المحادثات"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="لا توجد نتائج مطابقة."
          description="جرّب كلمات بحث مختلفة."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((conversation) => (
            <Card key={conversation.id} interactive className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-heading text-sm leading-snug font-semibold text-balance">
                  {conversation.title}
                </h3>
                <ConversationStatusBadge status={conversation.status} />
              </div>

              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {conversation.preview}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {conversation.entityName ? (
                  <span className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 font-medium">
                    {conversation.entityName}
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  <RelativeTime iso={conversation.updatedAt} />
                </span>
              </div>

              <div className="border-border mt-auto flex items-center gap-1 border-t pt-3">
                <Link
                  href={`/dashboard/conversations/${conversation.id}`}
                  className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  متابعة المحادثة
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(conversation)}
                  className="text-danger hover:bg-danger/6 mr-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  حذف
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="حذف المحادثة"
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
