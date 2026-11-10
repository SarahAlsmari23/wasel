'use client'

import { ArrowLeft, ArrowRight, MessagesSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { deleteConversationAction } from '@/app/wasal/conversation-actions'
import { Button, buttonClasses } from '@/components/ui/button'
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
        <EmptyState icon={MessagesSquare} title={copy.noResults} description={copy.noResultsHint} />
      ) : (
        <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-2xl border">
          {visible.map((conversation) => (
            <li
              key={conversation.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    dir="auto"
                    className="text-match-parent text-heading text-sm leading-snug font-semibold"
                  >
                    <Link
                      href={`/dashboard/conversations/${conversation.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {localizeTitle(conversation.title, locale)}
                    </Link>
                  </h3>
                  <ConversationStatusBadge status={conversation.status} locale={locale} />
                </div>
                <p
                  dir="auto"
                  className="text-match-parent text-muted-foreground mt-1 truncate text-sm"
                >
                  {conversation.preview}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {conversation.entityName ? (
                    <>
                      <span className="text-secondary font-medium">
                        {entityDisplayName(conversation.entityName, locale)}
                      </span>
                      <span aria-hidden="true"> · </span>
                    </>
                  ) : null}
                  <RelativeTime iso={conversation.updatedAt} />
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                <Link
                  href={`/dashboard/conversations/${conversation.id}`}
                  className="text-primary hover:bg-surface-tint inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
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
                  aria-label={`${copy.delete}: ${localizeTitle(conversation.title, locale)}`}
                  className="text-muted-foreground hover:text-danger hover:bg-danger/6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null)
        }}
        title={copy.deleteTitle}
        description={
          pendingDelete ? copy.deleteConfirm(localizeTitle(pendingDelete.title, locale)) : undefined
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
