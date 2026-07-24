'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
    <main className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-arabic text-primary mb-2 text-center text-2xl font-semibold">وصال</p>
        <Card className="mt-4">
          <h1 className="text-foreground mb-6 text-center text-xl font-semibold">تسجيل الدخول</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="text-foreground mb-1 block text-sm font-medium">
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
                className="text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-foreground mb-1 block text-sm font-medium">
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
                className="text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
              />
            </div>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              تسجيل الدخول
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            أو
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleOAuthButton />

          <p className="mt-6 text-center text-sm text-gray-600">
            ليس لديك حساب؟{' '}
            <Link href="/auth/sign-up" className="text-primary font-medium underline">
              إنشاء حساب
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
