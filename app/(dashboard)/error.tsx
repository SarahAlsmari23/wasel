'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { useCopy } from '@/components/i18n/locale-provider'
import { Button, buttonClasses } from '@/components/ui/button'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({
  ar: {
    title: 'تعذر تحميل هذه الصفحة',
    body: 'حدث خطأ أثناء عرض البيانات. يمكنك إعادة المحاولة أو الانتقال إلى صفحة أخرى من القائمة.',
    devDetails: 'تفاصيل الخطأ (بيئة التطوير فقط)',
    retry: 'إعادة المحاولة',
    dashboard: 'لوحة التحكم',
  },
  en: {
    title: "This page couldn't be loaded",
    body: 'Something went wrong while showing the data. Try again, or open another page from the menu.',
    devDetails: 'Error details (development only)',
    retry: 'Try again',
    dashboard: 'Dashboard',
  },
})

/**
 * Scoped to the dashboard segment so a failure in one page keeps the sidebar,
 * top bar, and navigation usable instead of replacing the entire application
 * shell with a full-screen error.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const copy = useCopy(COPY)

  useEffect(() => {
    console.error('[wasal:dashboard] render failed', {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-16 text-center">
      <span className="bg-danger/10 text-danger flex h-14 w-14 items-center justify-center rounded-2xl">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-heading text-xl font-semibold">{copy.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {copy.body}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground/70 text-xs" dir="ltr">
            ref: {error.digest}
          </p>
        ) : null}
      </div>

      {isDevelopment ? (
        <details className="border-danger/25 bg-danger/5 w-full rounded-2xl border p-4 text-start">
          <summary className="text-danger cursor-pointer text-sm font-medium">
            {copy.devDetails}
          </summary>
          <p className="text-foreground mt-3 text-sm font-semibold" dir="ltr">
            {error.name}: {error.message}
          </p>
          {error.stack ? (
            <pre
              dir="ltr"
              className="text-muted-foreground mt-3 max-h-72 overflow-auto text-xs whitespace-pre-wrap"
            >
              {error.stack}
            </pre>
          ) : null}
        </details>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {copy.retry}
        </Button>
        <Link href="/dashboard" className={buttonClasses('outline', 'md')}>
          {copy.dashboard}
        </Link>
      </div>
    </div>
  )
}
