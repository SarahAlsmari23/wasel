'use client'

import { Home, RotateCcw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { WaselLogo } from '@/components/brand/wasel-logo'
import { useCopy } from '@/components/i18n/locale-provider'
import { Button, buttonClasses } from '@/components/ui/button'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    homeAria: 'واصل — الصفحة الرئيسية',
    title: 'حدث خطأ غير متوقع',
    body: 'يرجى المحاولة مرة أخرى لاحقاً.',
    devDetails: 'تفاصيل الخطأ (بيئة التطوير فقط)',
    retry: 'إعادة المحاولة',
    home: 'العودة للرئيسية',
  },
  en: {
    homeAria: 'Wasel — home',
    title: 'Something went wrong',
    body: 'Please try again later.',
    devDetails: 'Error details (development only)',
    retry: 'Try again',
    home: 'Back to home',
  },
})

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const copy = useCopy(COPY)

  useEffect(() => {
    // Always log the whole error object. The previous version logged only the
    // digest, which meant a crash left no way to find out what actually broke
    // — the same failure mode the auth error messages had.
    console.error('[wasal] unhandled error', {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    })
  }, [error])

  return (
    <main
      id="main-content"
      className="bg-background wasel-canvas flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-16 text-center"
    >
      <Link href="/" aria-label={copy.homeAria}>
        <WaselLogo size="lg" />
      </Link>

      <span className="bg-danger/10 text-danger animate-scale-in flex h-16 w-16 items-center justify-center rounded-2xl">
        <TriangleAlert className="h-7 w-7" aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-heading text-2xl font-semibold sm:text-3xl">{copy.title}</h1>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{copy.body}</p>
        {error.digest ? (
          <p className="text-muted-foreground/70 mt-1 text-xs" dir="ltr">
            ref: {error.digest}
          </p>
        ) : null}
      </div>

      {/*
        In development the actual error is shown inline. Without this a crash
        produces a dead end: the user sees generic Arabic text and the cause is
        only in the terminal, which is exactly how this page hid a real bug.
        Never rendered in production builds.
      */}
      {isDevelopment ? (
        <details className="border-danger/25 bg-danger/5 w-full max-w-2xl rounded-2xl border p-4 text-start">
          <summary className="text-danger cursor-pointer text-sm font-medium">
            {copy.devDetails}
          </summary>
          <p className="text-foreground mt-3 text-sm font-semibold" dir="ltr">
            {error.name}: {error.message}
          </p>
          {error.stack ? (
            <pre
              dir="ltr"
              className="text-muted-foreground mt-3 max-h-80 overflow-auto text-xs leading-relaxed whitespace-pre-wrap"
            >
              {error.stack}
            </pre>
          ) : null}
        </details>
      ) : null}

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button type="button" onClick={reset} className="w-full sm:w-auto">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {copy.retry}
        </Button>
        <Link href="/" className={buttonClasses('outline', 'md', 'w-full sm:w-auto')}>
          <Home className="h-4 w-4" aria-hidden="true" />
          {copy.home}
        </Link>
      </div>
    </main>
  )
}
