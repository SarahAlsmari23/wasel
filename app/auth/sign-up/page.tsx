'use client'

import { MailCheck } from 'lucide-react'
import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthCard, AuthDivider } from '@/components/auth/auth-card'
import { AuthErrorNotice } from '@/components/auth/auth-error-notice'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { Button, buttonClasses } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { getAuthErrorDetails, type AuthErrorDetails } from '@/lib/auth/error-messages'
import { resolveRedirectPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'

const MIN_PASSWORD_LENGTH = 6

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const nextPath = resolveRedirectPath(searchParams.get('next'))

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthErrorDetails | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)
  /** The address actually submitted, shown on the confirmation screen. */
  const [attemptedEmail, setAttemptedEmail] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setConfirmError(null)

    // Read from the form rather than React state alone — credentials entered
    // before hydration (slow connection, password manager autofill) never fire
    // onChange, which would submit an empty email.
    const formData = new FormData(event.currentTarget)
    const submittedEmail = String(formData.get('email') ?? '').trim() || email.trim()
    const submittedPassword = String(formData.get('password') ?? '') || password
    const submittedConfirm = String(formData.get('confirmPassword') ?? '') || confirmPassword
    const submittedName = String(formData.get('fullName') ?? '').trim() || fullName.trim()

    if (submittedPassword !== submittedConfirm) {
      setConfirmError('كلمتا المرور غير متطابقتين.')
      return
    }

    if (!submittedEmail || !submittedPassword) {
      setError({
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
        code: 'missing_credentials',
      })
      return
    }

    setIsSubmitting(true)
    setAttemptedEmail(submittedEmail)

    try {
      const supabase = createClient()
      const trimmedEmail = submittedEmail
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: submittedPassword,
        options: {
          data: { full_name: submittedName || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (signUpError) {
        setError(getAuthErrorDetails(signUpError))
        return
      }

      // When confirmations are on, Supabase hides account enumeration by
      // returning a user with an empty `identities` array for an address that
      // is already registered. Without this check the UI would claim a new
      // account was created and send the user to an inbox with nothing in it.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError({
          message:
            'هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول، أو أعد إرسال رابط التفعيل من صفحة تسجيل الدخول.',
          code: 'user_already_exists',
        })
        return
      }

      // A session is only returned when email confirmation is disabled on the
      // Supabase project. Otherwise the user must click the emailed link first.
      if (data.session) {
        showToast('تم إنشاء حسابك بنجاح.')
        router.push(nextPath)
        router.refresh()
        return
      }

      setAwaitingEmailConfirmation(true)
    } catch (unexpectedError) {
      setError(getAuthErrorDetails(unexpectedError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="animate-scale-in bg-surface border-border shadow-lift w-full max-w-md rounded-3xl border p-8 text-center">
        <span className="bg-status-completed/12 text-status-completed mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-heading mt-5 text-xl font-semibold">فعّل بريدك الإلكتروني</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          أرسلنا رابط تفعيل إلى <span dir="ltr">{attemptedEmail || email.trim()}</span>. يجب الضغط
          على الرابط قبل أن تتمكن من تسجيل الدخول.
        </p>
        <p className="text-muted-foreground bg-surface-muted mt-4 rounded-xl px-3 py-2.5 text-xs leading-relaxed">
          لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها، أو أعد إرسال الرابط من صفحة تسجيل
          الدخول بعد إدخال بياناتك.
        </p>
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
          className={buttonClasses('primary', 'md', 'mt-6 w-full')}
        >
          الذهاب إلى تسجيل الدخول
        </Link>
      </div>
    )
  }

  return (
    <AuthCard
      title="إنشاء حساب"
      subtitle="أنشئ حسابك لبدء إعداد بلاغاتك وحفظها."
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline"
          >
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field htmlFor="fullName" label="الاسم الكامل">
          <TextInput
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="مثال: محمد عبدالله"
            defaultValue=""
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSubmitting}
          />
        </Field>

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
          />
        </Field>

        <Field
          htmlFor="password"
          label="كلمة المرور"
          hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل.`}
        >
          <TextInput
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            defaultValue=""
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </Field>

        <Field
          htmlFor="confirmPassword"
          label="تأكيد كلمة المرور"
          error={confirmError ?? undefined}
        >
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            defaultValue=""
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? 'confirmPassword-error' : undefined}
          />
        </Field>

        {error ? <AuthErrorNotice details={error} /> : null}

        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
          إنشاء الحساب
        </Button>
      </form>

      <AuthDivider />

      <GoogleOAuthButton nextPath={nextPath} />
    </AuthCard>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}
