'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthCard, AuthDivider } from '@/components/auth/auth-card'
import { AuthErrorNotice } from '@/components/auth/auth-error-notice'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { ResendConfirmationButton } from '@/components/auth/resend-confirmation-button'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import {
  getAuthErrorDetails,
  isEmailNotConfirmed,
  type AuthErrorDetails,
} from '@/lib/auth/error-messages'
import { resolveRedirectPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const nextPath = resolveRedirectPath(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthErrorDetails | null>(null)
  /** The address actually submitted, so "resend" targets the right account. */
  const [attemptedEmail, setAttemptedEmail] = useState('')

  // Surface failures bounced back from /auth/callback (expired or already-used
  // confirmation links) instead of dropping the user here with no explanation.
  const callbackError = searchParams.get('error')
  const callbackErrorCode = searchParams.get('error_code')
  const callbackErrorDescription = searchParams.get('error_description')

  useEffect(() => {
    if (!callbackError) return
    setError({
      message:
        callbackErrorCode === 'otp_expired'
          ? 'انتهت صلاحية رابط التفعيل. اطلب رابطاً جديداً بتسجيل الدخول ثم إعادة الإرسال.'
          : 'تعذر إتمام عملية التحقق. حاول تسجيل الدخول مرة أخرى.',
      code: callbackErrorCode ?? callbackError,
      rawMessage: callbackErrorDescription ?? undefined,
    })
  }, [callbackError, callbackErrorCode, callbackErrorDescription])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    // Read from the form itself rather than trusting React state alone. If the
    // user (or an autofill extension) enters credentials before hydration
    // completes, onChange never fires and the state is still empty — which
    // sent Supabase a blank email and surfaced as a confusing
    // "missing email or phone" validation error.
    const formData = new FormData(event.currentTarget)
    const submittedEmail = String(formData.get('email') ?? '').trim() || email.trim()
    const submittedPassword = String(formData.get('password') ?? '') || password

    if (!submittedEmail || !submittedPassword) {
      setError({
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
        code: 'missing_credentials',
      })
      return
    }

    setIsSubmitting(true)
    setError(null)
    setAttemptedEmail(submittedEmail)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: submittedEmail,
        password: submittedPassword,
      })

      if (signInError) {
        setError(getAuthErrorDetails(signInError))
        return
      }

      // signInWithPassword resolves without an error but without a session in
      // edge cases (e.g. an MFA challenge is pending). Redirecting here would
      // bounce straight back off the middleware, so treat it as a failure.
      if (!data.session) {
        setError({
          message: 'تعذر إنشاء الجلسة. حاول مرة أخرى.',
          code: 'no_session_returned',
        })
        return
      }

      showToast('تم تسجيل الدخول بنجاح.')
      // push() before refresh(): the browser client has already written the
      // auth cookie synchronously, so navigating first gets the user moving
      // immediately. Refreshing first re-fetches the *sign-in* route and
      // measurably delays the push, which left users sitting on this page for
      // seconds after a successful login.
      router.push(nextPath)
      router.refresh()
    } catch (unexpectedError) {
      setError(getAuthErrorDetails(unexpectedError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="تسجيل الدخول"
      subtitle="أهلاً بعودتك — سجّل الدخول لمتابعة بلاغاتك."
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link
            href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline"
          >
            إنشاء حساب
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field htmlFor="email" label="البريد الإلكتروني">
          <TextInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            defaultValue=""
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={error ? true : undefined}
          />
        </Field>

        <Field htmlFor="password" label="كلمة المرور">
          <TextInput
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            defaultValue=""
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={error ? true : undefined}
          />
        </Field>

        {error ? (
          <AuthErrorNotice
            details={error}
            action={
              isEmailNotConfirmed(error) ? (
                <ResendConfirmationButton
                  email={attemptedEmail || email.trim()}
                  nextPath={nextPath}
                />
              ) : null
            }
          />
        ) : null}

        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
          تسجيل الدخول
        </Button>
      </form>

      <AuthDivider />

      <GoogleOAuthButton nextPath={nextPath} />
    </AuthCard>
  )
}

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary to keep the route statically
  // renderable up to the point the query string is read.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
