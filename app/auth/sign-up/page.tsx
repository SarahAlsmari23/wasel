'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
      <main className="bg-background flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-foreground mb-4 text-xl font-semibold">تم إنشاء الحساب</h1>
          <p className="text-sm text-gray-600">
            يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب قبل تسجيل الدخول.
          </p>
          <p className="mt-6 text-sm">
            <Link href="/auth/sign-in" className="text-primary font-medium underline">
              العودة إلى تسجيل الدخول
            </Link>
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-arabic text-primary mb-2 text-center text-2xl font-semibold">وصال</p>
        <Card className="mt-4">
          <h1 className="text-foreground mb-6 text-center text-xl font-semibold">إنشاء حساب</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="fullName" className="text-foreground mb-1 block text-sm font-medium">
                الاسم الكامل
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isSubmitting}
                className="text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
              />
            </div>

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
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
              />
            </div>

            {error ? <p className="text-danger text-sm">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              إنشاء حساب
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            أو
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleOAuthButton />

          <p className="mt-6 text-center text-sm text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link href="/auth/sign-in" className="text-primary font-medium underline">
              تسجيل الدخول
            </Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
