'use client'

import { MailCheck, Send } from 'lucide-react'
import { useState } from 'react'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { useToast } from '@/components/ui/toast'
import { defineCopy } from '@/lib/i18n/config'
import { getAuthErrorDetails } from '@/lib/auth/error-messages'
import { createClient } from '@/lib/supabase/client'

const COPY = defineCopy({
  ar: {
    sentToast: 'تم إرسال رابط التفعيل إلى بريدك.',
    sent: 'تم إرسال رابط التفعيل — تحقق من بريدك (ومجلد الرسائل غير المرغوبة).',
    sending: 'جارٍ الإرسال...',
    resend: 'إعادة إرسال رابط التفعيل',
  },
  en: {
    sentToast: 'A confirmation link was sent to your email.',
    sent: 'Confirmation link sent — check your inbox (and spam folder).',
    sending: 'Sending...',
    resend: 'Resend the confirmation link',
  },
})

type ResendConfirmationButtonProps = {
  email: string
  /** Where the confirmation link should land the user afterwards. */
  nextPath: string
}

/**
 * Turns the "email not confirmed" dead end into something the user can act on
 * without leaving the page.
 */
export function ResendConfirmationButton({ email, nextPath }: ResendConfirmationButtonProps) {
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const locale = useLocale()
  const [isSending, setIsSending] = useState(false)
  const [wasSent, setWasSent] = useState(false)

  async function handleResend() {
    if (isSending || !email) return
    setIsSending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (error) {
        const details = getAuthErrorDetails(error, locale)
        showToast(details.message, 'error')
        return
      }

      setWasSent(true)
      showToast(copy.sentToast)
    } finally {
      setIsSending(false)
    }
  }

  if (wasSent) {
    return (
      <p className="text-status-completed flex items-center gap-1.5 text-xs font-medium">
        <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.sent}
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={isSending || !email}
      className="text-danger inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2 disabled:opacity-50"
    >
      <Send className="h-3 w-3" aria-hidden="true" />
      {isSending ? copy.sending : copy.resend}
    </button>
  )
}
