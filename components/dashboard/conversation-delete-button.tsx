'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteConversationAction } from '@/app/(site)/wasal/conversation-actions'
import { Button, buttonClasses } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useCopy } from '@/components/i18n/locale-provider'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    deleted: 'تم حذف المحادثة',
    deleteFailed: 'حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.',
    button: 'حذف المحادثة',
    confirm: (title: string) =>
      `سيتم حذف «${title}» نهائياً مع رسائلها وأي بلاغ مرتبط بها. لا يمكن التراجع عن هذا الإجراء.`,
    delete: 'حذف',
    cancel: 'إلغاء',
  },
  en: {
    deleted: 'Conversation deleted',
    deleteFailed: 'Something went wrong while deleting. Please try again.',
    button: 'Delete conversation',
    confirm: (title: string) =>
      `“${title}” will be permanently deleted, along with its messages and any linked complaint. This can't be undone.`,
    delete: 'Delete',
    cancel: 'Cancel',
  },
})

type ConversationDeleteButtonProps = {
  conversationId: string
  title: string
}

/** The conversation detail page's own delete entry point (Phase 6.7, Part 2)
 * — a separate call site from the dashboard list's delete button, using the
 * same real, authenticated `deleteConversationAction`. Redirects back to the
 * conversations list only once deletion is actually confirmed. */
export function ConversationDeleteButton({ conversationId, title }: ConversationDeleteButtonProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const result = await deleteConversationAction(conversationId)
      if (result.success) {
        showToast(copy.deleted)
        router.push('/dashboard/conversations')
      } else {
        setIsConfirmOpen(false)
        showToast(result.error, 'error')
      }
    } catch {
      setIsConfirmOpen(false)
      showToast(copy.deleteFailed, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        className={buttonClasses('outline', 'md', 'text-danger w-full sm:w-auto')}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {copy.button}
      </button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isDeleting) setIsConfirmOpen(false)
        }}
        title={copy.button}
        description={copy.confirm(title)}
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
              onClick={() => setIsConfirmOpen(false)}
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
