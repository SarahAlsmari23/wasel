'use client'

import { ArrowLeft, ArrowRight, MessagesSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { deleteConversationAction } from '@/app/wasal/conversation-actions'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { RelativeTime } from '@/components/ui/relative-time'
import { SearchInput } from '@/components/ui/search-input'
import { ConversationStatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/toast'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { localizeTitle } from '@/lib/complaints/display'
import { defineCopy } from '@/lib/i18n/config'
import { entityDisplayName } from '@/lib/mock/government-entities'
import type { MockConversation } from '@/types/conversation'

const COPY = defineCopy({
  ar: {
    deleted: 'تم حذف المحادثة',
    deleteFailed: 'حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.',
    emptyTitle: 'لا توجد محادثات محفوظة.',
    emptyBody: 'ابدأ أول محادثة مع واصل واسأله عن أي شيء يخص بلاغك.',
    start: 'ابدأ محادثة جديدة',
    searchPlaceholder: 'ابحث في المحادثات...',
    searchLabel: 'البحث في المحادثات',
    noResults: 'لا توجد نتائج مطابقة.',
    noResultsHint: 'جرّب كلمات بحث مختلفة.',
    continue: 'متابعة المحادثة',
    delete: 'حذف',
    deleteTitle: 'حذف المحادثة',
    deleteConfirm: (title: string) =>
      `سيتم حذف «${title}» نهائياً مع رسائلها وأي بلاغ مرتبط بها. لا يمكن التراجع عن هذا الإجراء.`,
    cancel: 'إلغاء',
  },
  en: {
    deleted: 'Conversation deleted',
    deleteFailed: 'Something went wrong while deleting. Please try again.',
    emptyTitle: 'No saved conversations.',
    emptyBody: 'Start your first conversation with Wasel and ask anything about your complaint.',
    start: 'Start a new conversation',
    searchPlaceholder: 'Search conversations...',
    searchLabel: 'Search conversations',
    noResults: 'No matching results.',
    noResultsHint: 'Try different search words.',
    continue: 'Continue conversation',
    delete: 'Delete',
    deleteTitle: 'Delete conversation',
    deleteConfirm: (title: string) =>
      `“${title}” will be permanently deleted, along with its messages and any linked complaint. This can't be undone.`,
    cancel: 'Cancel',
  },
})

type ConversationsBrowserProps = {
  conversations: MockConversation[]
}

export function ConversationsBrowser({ conversations }: ConversationsBrowserProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const [items, setItems] = useState(conversations)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MockConversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  async function handleConfirmDelete() {
    if (!pendingDelete || isDeleting) return
    const target = pendingDelete
    setIsDeleting(true)
    try {
      const result = await deleteConversationAction(target.id)
      if (result.success) {
        // Only removed from the list once the deletion is actually confirmed
        // server-side — never optimistically.
        setItems((current) => current.filter((item) => item.id !== target.id))
        setPendingDelete(null)
        showToast(copy.deleted)
      } else {
        setPendingDelete(null)
        showToast(result.error, 'error')
      }
    } catch {
      setPendingDelete(null)
      showToast(copy.deleteFailed, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title={copy.emptyTitle}
        description={copy.emptyBody}
        action={
          <Link href="/wasal?mode=assistant" className={buttonClasses('primary', 'md')}>
            {copy.start}
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
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchLabel}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={copy.noResults}
          description={copy.noResultsHint}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((conversation) => (
            <Card key={conversation.id} interactive className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3
                  dir="auto"
                  className="text-heading text-sm leading-snug font-semibold text-balance"
                >
                  {localizeTitle(conversation.title, locale)}
                </h3>
                <ConversationStatusBadge status={conversation.status} locale={locale} />
              </div>

              <p dir="auto" className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {conversation.preview}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {conversation.entityName ? (
                  <span className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 font-medium">
                    {entityDisplayName(conversation.entityName, locale)}
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
                  {copy.continue}
                  {locale === 'ar' ? (
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(conversation)}
                  className="text-danger hover:bg-danger/6 ms-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.delete}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null)
        }}
        title={copy.deleteTitle}
        description={
          pendingDelete
            ? copy.deleteConfirm(localizeTitle(pendingDelete.title, locale))
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              isLoading={isDeleting}
              className="w-full sm:flex-1"
            >
              {copy.delete}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
              className="w-full sm:flex-1"
            >
              {copy.cancel}
            </Button>
          </>
        }
      />
    </div>
  )
}
