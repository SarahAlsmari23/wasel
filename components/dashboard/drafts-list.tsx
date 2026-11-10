'use client'

import { ArrowLeft, ArrowRight, FolderClock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { deleteConversationAction } from '@/app/wasal/conversation-actions'
import { GovernmentLogo } from '@/components/government/government-logo'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { RelativeTime } from '@/components/ui/relative-time'
import { useToast } from '@/components/ui/toast'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'
import type { DraftRecord } from '@/lib/db/conversations'
import { entityDisplayName, getGovernmentEntityByName } from '@/lib/mock/government-entities'
import { localizeTitle } from '@/lib/complaints/display'

const COPY = defineCopy({
  ar: {
    deleted: 'تم حذف المسودة',
    deleteFailed: 'حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.',
    emptyTitle: 'لا توجد مسودات محفوظة.',
    emptyBody: 'المسودات هي بلاغات لم تكتمل بعد — يمكنك العودة إليها في أي وقت.',
    start: 'ابدأ بلاغاً جديداً',
    lastEdited: 'آخر تعديل',
    continue: 'متابعة',
    delete: 'حذف',
    deleteTitle: 'حذف المسودة',
    deleteConfirm: (title: string) =>
      `سيتم حذف «${title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
    cancel: 'إلغاء',
  },
  en: {
    deleted: 'Draft deleted',
    deleteFailed: 'Something went wrong while deleting. Please try again.',
    emptyTitle: 'No saved drafts.',
    emptyBody:
      "Drafts are complaints you haven't finished yet — you can come back to them at any time.",
    start: 'Start a new complaint',
    lastEdited: 'Last edited',
    continue: 'Continue',
    delete: 'Delete',
    deleteTitle: 'Delete draft',
    deleteConfirm: (title: string) =>
      `“${title}” will be permanently deleted. This can't be undone.`,
    cancel: 'Cancel',
  },
})

type DraftsListProps = {
  drafts: DraftRecord[]
}

export function DraftsList({ drafts }: DraftsListProps) {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const { showToast } = useToast()
  const [items, setItems] = useState(drafts)
  const [pendingDelete, setPendingDelete] = useState<DraftRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (!pendingDelete || isDeleting) return
    const target = pendingDelete
    setIsDeleting(true)
    try {
      const result = await deleteConversationAction(target.id)
      if (result.success) {
        // Only removed from the list once the deletion is actually confirmed
        // server-side — never optimistically, so a refresh can never bring
        // it back (Phase 6.8, Part 1).
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
        icon={FolderClock}
        title={copy.emptyTitle}
        description={copy.emptyBody}
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            {copy.start}
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {items.map((draft) => {
          const entity = draft.entityName ? getGovernmentEntityByName(draft.entityName) : undefined
          return (
            <Card
              key={draft.id}
              interactive
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
            >
              <GovernmentLogo iconKey={entity?.iconKey} size="sm" />

              <div className="min-w-0 flex-1">
                <h3 dir="auto" className="text-heading text-sm font-semibold text-balance">
                  {localizeTitle(draft.title, locale)}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {entityDisplayName(draft.entityName, locale)} · {copy.lastEdited}{' '}
                  <RelativeTime iso={draft.updatedAt} />
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/wasal?conversationId=${draft.id}`}
                  className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
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
                  onClick={() => setPendingDelete(draft)}
                  className="text-danger hover:bg-danger/6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.delete}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

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
    </>
  )
}
