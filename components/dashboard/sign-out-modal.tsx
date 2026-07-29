'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { createClient } from '@/lib/supabase/client'

type SignOutModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SignOutModal({ isOpen, onClose }: SignOutModalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSignOut() {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        showToast(getAuthErrorMessage(error), 'error')
        setIsSubmitting(false)
        return
      }

      onClose()
      router.refresh()
      router.push('/')
    } catch (unexpectedError) {
      showToast(getAuthErrorMessage(unexpectedError), 'error')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل الخروج"
      description="هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستحتاج إلى تسجيل الدخول مجدداً للوصول إلى بلاغاتك."
      footer={
        <>
          <Button
            type="button"
            variant="danger"
            onClick={handleSignOut}
            isLoading={isSubmitting}
            className="w-full sm:flex-1"
          >
            تسجيل الخروج
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            إلغاء
          </Button>
        </>
      }
    />
  )
}
