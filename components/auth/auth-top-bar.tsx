'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { useCopy, useLocale } from '@/components/i18n/locale-provider'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { defineCopy } from '@/lib/i18n/config'

const COPY = defineCopy({ ar: { back: 'العودة إلى الرئيسية' }, en: { back: 'Back to home' } })

/** Minimal bar for the auth pages: a way home, language and theme. */
export function AuthTopBar() {
  const copy = useCopy(COPY)
  const locale = useLocale()
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors"
      >
        <BackArrow className="h-4 w-4" aria-hidden="true" />
        {copy.back}
      </Link>
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  )
}
