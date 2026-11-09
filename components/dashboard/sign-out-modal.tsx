'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { defineCopy } from '@/lib/i18n/config'
import { clearConversation } from '@/lib/wasal/conversation-storage'

const COPY = defineCopy({
  ar: {
    title: 'تسجيل الخروج',
    description: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستحتاج إلى تسجيل الدخول مجدداً للوصول إلى بلاغاتك.',
    confirm: 'تسجيل الخروج',
    cancel: 'إلغاء',
  },
  en: {
    title: 'Sign out',
    description: "Are you sure you want to sign out? You'll need to sign in again to access your complaints.",
    confirm: 'Sign out',
    cancel: 'Cancel',
  },
})
import { createClient } from '@/lib/supabase/client'

type SignOutModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SignOutModal({ isOpen, onClose }: SignOutModalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const locale = useLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSignOut() {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        showToast(getAuthErrorMessage(error, locale), 'error')
        setIsSubmitting(false)
        return
      }

      // Drop any in-browser conversation copy so nothing from this account
      // is visible to whoever uses the browser next.
      clearConversation()
      onClose()
      router.replace('/')
      router.refresh()
    } catch (unexpectedError) {
      showToast(getAuthErrorMessage(unexpectedError, locale), 'error')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button
            type="button"
            variant="danger"
            onClick={handleSignOut}
            isLoading={isSubmitting}
            className="w-full sm:flex-1"
          >
            {copy.confirm}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:flex-1"
          >
            {copy.cancel}
          </Button>
        </>
      }
    />
  )
}
