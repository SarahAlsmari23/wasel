'use client'

import { Languages } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useLocale } from '@/components/i18n/locale-provider'
import {
  defineCopy,
  directionFor,
  htmlLangFor,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: { label: 'English', ariaLabel: 'Switch to English', short: 'EN' },
  en: { label: 'العربية', ariaLabel: 'التبديل إلى العربية', short: 'ع' },
})

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const copy = COPY[locale]
  const nextLocale: Locale = locale === 'ar' ? 'en' : 'ar'

  function switchLanguage() {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
    // Flip direction immediately so the layout doesn't sit mirrored while the
    // server re-renders the page in the new language.
    document.documentElement.lang = htmlLangFor(nextLocale)
    document.documentElement.dir = directionFor(nextLocale)
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={isPending}
      aria-label={copy.ariaLabel}
      title={copy.ariaLabel}
      lang={nextLocale === 'ar' ? 'ar' : 'en'}
      className={cn(
        'text-muted-foreground hover:bg-surface-tint hover:text-primary inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors duration-200 disabled:opacity-60',
        className,
      )}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{copy.label}</span>
      <span className="sm:hidden">{copy.short}</span>
    </button>
  )
}
