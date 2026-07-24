'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(getAuthErrorMessage(signInError.message))
        return
      }

      router.push('/')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">تسجيل الدخول</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-foreground text-background w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            تسجيل الدخول
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
          <span className="h-px flex-1 bg-current" />
          أو
          <span className="h-px flex-1 bg-current" />
        </div>

        <GoogleOAuthButton />

        <p className="mt-6 text-center text-sm">
          ليس لديك حساب؟{' '}
          <Link href="/auth/sign-up" className="font-medium underline">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </main>
  )
}
