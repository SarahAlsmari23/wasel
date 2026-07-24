'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { Button } from '@/components/ui/button'

export function GoogleOAuthButton() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError(getAuthErrorMessage(oauthError.message))
        setIsSubmitting(false)
      }
      // On success the browser is redirected away by Supabase, so there is
      // no success state to render here.
    } catch {
      setError(getAuthErrorMessage(null))
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
        className="w-full"
      >
        المتابعة باستخدام جوجل
      </Button>
      {error ? <p className="text-danger mt-2 text-sm">{error}</p> : null}
    </div>
  )
}
