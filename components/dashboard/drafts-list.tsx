'use client'

import { ArrowLeft, FolderClock, Trash2 } from 'lucide-react'
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
import type { DraftRecord } from '@/lib/db/conversations'
import { getGovernmentEntityByName } from '@/lib/mock/government-entities'

type DraftsListProps = {
  drafts: DraftRecord[]
}

export function DraftsList({ drafts }: DraftsListProps) {
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
        showToast('تم حذف المسودة')
      } else {
        setPendingDelete(null)
        showToast(result.error, 'error')
      }
    } catch {
      setPendingDelete(null)
      showToast('حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FolderClock}
        title="لا توجد مسودات محفوظة."
        description="المسودات هي بلاغات لم تكتمل بعد — يمكنك العودة إليها في أي وقت."
        action={
          <Link href="/wasal?mode=complaint" className={buttonClasses('primary', 'md')}>
            ابدأ بلاغاً جديداً
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
                <h3 className="text-heading text-sm font-semibold text-balance">{draft.title}</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {draft.entityName ?? ''} · آخر تعديل <RelativeTime iso={draft.updatedAt} />
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/wasal?conversationId=${draft.id}`}
                  className="text-foreground hover:bg-primary/6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                >
                  متابعة
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(draft)}
                  className="text-danger hover:bg-danger/6 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  حذف
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
        title="حذف المسودة"
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
              onClick={() => void handleConfirmDelete()}
              isLoading={isDeleting}
              className="w-full sm:flex-1"
            >
              حذف
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
              className="w-full sm:flex-1"
            >
              إلغاء
            </Button>
          </>
        }
      />
    </>
  )
}
