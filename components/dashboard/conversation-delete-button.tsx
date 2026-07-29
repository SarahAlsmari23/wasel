'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteConversationAction } from '@/app/wasal/conversation-actions'
import { Button, buttonClasses } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const result = await deleteConversationAction(conversationId)
      if (result.success) {
        showToast('تم حذف المحادثة')
        router.push('/dashboard/conversations')
      } else {
        setIsConfirmOpen(false)
        showToast(result.error, 'error')
      }
    } catch {
      setIsConfirmOpen(false)
      showToast('حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.', 'error')
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
        حذف المحادثة
      </button>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isDeleting) setIsConfirmOpen(false)
        }}
        title="حذف المحادثة"
        description={`سيتم حذف «${title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.`}
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
              onClick={() => setIsConfirmOpen(false)}
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
