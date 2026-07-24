'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError.message))
        return
      }

      if (data.session) {
        router.push('/')
        router.refresh()
        return
      }

      setCheckEmail(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (checkEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-4 text-2xl font-semibold">تم إنشاء الحساب</h1>
          <p className="text-sm">يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب قبل تسجيل الدخول.</p>
          <p className="mt-6 text-sm">
            <Link href="/auth/sign-in" className="font-medium underline">
              العودة إلى تسجيل الدخول
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold">إنشاء حساب</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
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
            إنشاء حساب
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
          <span className="h-px flex-1 bg-current" />
          أو
          <span className="h-px flex-1 bg-current" />
        </div>

        <GoogleOAuthButton />

        <p className="mt-6 text-center text-sm">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/sign-in" className="font-medium underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  )
}
