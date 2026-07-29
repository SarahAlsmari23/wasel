'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { DEFAULT_SIGNED_IN_PATH } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'

/** Google's brand mark, inlined so the button needs no external asset. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

type GoogleOAuthButtonProps = {
  /** Path to return to once the OAuth round-trip completes. */
  nextPath?: string
}

export function GoogleOAuthButton({ nextPath = DEFAULT_SIGNED_IN_PATH }: GoogleOAuthButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('next', nextPath)

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      })

      if (oauthError) {
        setError(getAuthErrorMessage(oauthError))
        setIsSubmitting(false)
      }
      // On success the browser is redirected away by Supabase, so there is
      // no success state to render here.
    } catch (unexpectedError) {
      setError(getAuthErrorMessage(unexpectedError))
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        isLoading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? null : <GoogleMark />}
        المتابعة باستخدام Google
      </Button>
      {error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
