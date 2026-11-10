'use client'

import { MailCheck } from 'lucide-react'
import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthCard, AuthDivider } from '@/components/auth/auth-card'
import { AuthErrorNotice } from '@/components/auth/auth-error-notice'
import { GoogleOAuthButton } from '@/components/auth/google-oauth-button'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { Button, buttonClasses } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { getAuthErrorDetails, type AuthErrorDetails } from '@/lib/auth/error-messages'
import { resolveRedirectPath } from '@/lib/auth/redirect'
import { defineCopy } from '@/lib/i18n/config'
import { createClient } from '@/lib/supabase/client'

const MIN_PASSWORD_LENGTH = 6

const COPY = defineCopy({
  ar: {
    passwordsMismatch: 'كلمتا المرور غير متطابقتين.',
    nameRequired: 'يرجى إدخال الاسم الكامل — يظهر في البلاغات الرسمية التي يصيغها واصل.',
    missingCredentials: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
    alreadyRegistered:
      'هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول، أو أعد إرسال رابط التفعيل من صفحة تسجيل الدخول.',
    created: 'تم إنشاء حسابك بنجاح.',
    confirmTitle: 'فعّل بريدك الإلكتروني',
    confirmSentTo: 'أرسلنا رابط تفعيل إلى',
    confirmBody: 'يجب الضغط على الرابط قبل أن تتمكن من تسجيل الدخول.',
    confirmHelp:
      'لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها، أو أعد إرسال الرابط من صفحة تسجيل الدخول بعد إدخال بياناتك.',
    goToSignIn: 'الذهاب إلى تسجيل الدخول',
    title: 'إنشاء حساب',
    subtitle: 'أنشئ حسابك لبدء إعداد بلاغاتك وحفظها.',
    haveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    fullName: 'الاسم الكامل',
    fullNameHint: 'يظهر اسمك في البلاغ الرسمي.',
    fullNamePlaceholder: 'مثال: محمد عبدالله',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordHint: `${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
    confirmPassword: 'تأكيد كلمة المرور',
    submit: 'إنشاء الحساب',
  },
  en: {
    passwordsMismatch: "The passwords don't match.",
    nameRequired: 'Please enter your full name — it appears in the formal complaints Wasel drafts.',
    missingCredentials: 'Please enter your email and password.',
    alreadyRegistered:
      'This email is already registered. Sign in, or resend the confirmation link from the sign-in page.',
    created: 'Your account was created.',
    confirmTitle: 'Confirm your email',
    confirmSentTo: 'We sent a confirmation link to',
    confirmBody: 'You need to click the link before you can sign in.',
    confirmHelp:
      "Didn't get it? Check your spam folder, or resend the link from the sign-in page after entering your details.",
    goToSignIn: 'Go to sign in',
    title: 'Create account',
    subtitle: 'Create your account to start preparing and saving your complaints.',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    fullName: 'Full name',
    fullNameHint: 'Your name appears on the formal complaint.',
    fullNamePlaceholder: 'e.g. Mohammed Abdullah',
    email: 'Email',
    password: 'Password',
    passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters.`,
    confirmPassword: 'Confirm password',
    submit: 'Create account',
  },
})

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const copy = useCopy(COPY)
  const locale = useLocale()
  const nextPath = resolveRedirectPath(searchParams.get('next'))

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthErrorDetails | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)
  /** The address actually submitted, shown on the confirmation screen. */
  const [attemptedEmail, setAttemptedEmail] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setConfirmError(null)
    setNameError(null)

    // Read from the form rather than React state alone — credentials entered
    // before hydration (slow connection, password manager autofill) never fire
    // onChange, which would submit an empty email.
    const formData = new FormData(event.currentTarget)
    const submittedEmail = String(formData.get('email') ?? '').trim() || email.trim()
    const submittedPassword = String(formData.get('password') ?? '') || password
    const submittedConfirm = String(formData.get('confirmPassword') ?? '') || confirmPassword
    const submittedName = String(formData.get('fullName') ?? '').trim() || fullName.trim()

    if (!submittedName) {
      setNameError(copy.nameRequired)
      return
    }

    if (submittedPassword !== submittedConfirm) {
      setConfirmError(copy.passwordsMismatch)
      return
    }

    if (!submittedEmail || !submittedPassword) {
      setError({
        message: copy.missingCredentials,
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
        setError(getAuthErrorDetails(signUpError, locale))
        return
      }

      // When confirmations are on, Supabase hides account enumeration by
      // returning a user with an empty `identities` array for an address that
      // is already registered. Without this check the UI would claim a new
      // account was created and send the user to an inbox with nothing in it.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError({
          message: copy.alreadyRegistered,
          code: 'user_already_exists',
        })
        return
      }

      // A session is only returned when email confirmation is disabled on the
      // Supabase project. Otherwise the user must click the emailed link first.
      if (data.session) {
        showToast(copy.created)
        router.replace(nextPath)
        router.refresh()
        return
      }

      setAwaitingEmailConfirmation(true)
    } catch (unexpectedError) {
      setError(getAuthErrorDetails(unexpectedError, locale))
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
        <h1 className="text-heading mt-5 text-xl font-semibold">{copy.confirmTitle}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {copy.confirmSentTo} <span dir="ltr">{attemptedEmail || email.trim()}</span>.{' '}
          {copy.confirmBody}
        </p>
        <p className="text-muted-foreground bg-surface-muted mt-4 rounded-xl px-3 py-2.5 text-xs leading-relaxed">
          {copy.confirmHelp}
        </p>
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
          className={buttonClasses('primary', 'md', 'mt-6 w-full')}
        >
          {copy.goToSignIn}
        </Link>
      </div>
    )
  }

  return (
    <AuthCard
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          {copy.haveAccount}{' '}
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
            className="text-primary font-medium hover:underline"
          >
            {copy.signIn}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          htmlFor="fullName"
          label={copy.fullName}
          hint={nameError ? undefined : copy.fullNameHint}
          error={nameError ?? undefined}
        >
          <TextInput
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder={copy.fullNamePlaceholder}
            defaultValue=""
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'fullName-error' : undefined}
          />
        </Field>

        <Field htmlFor="email" label={copy.email}>
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

        <Field htmlFor="password" label={copy.password} hint={copy.passwordHint}>
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
          label={copy.confirmPassword}
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
          {copy.submit}
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
