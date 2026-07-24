'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError(getAuthErrorMessage(signOutError.message))
        return
      }

      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isSubmitting}
        className="px-3 py-1.5"
      >
        تسجيل الخروج
      </Button>
      {error ? <p className="text-danger mt-2 text-sm">{error}</p> : null}
    </div>
  )
}
