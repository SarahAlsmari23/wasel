'use client'

import { Languages } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { useChangeLocale } from '@/components/i18n/use-change-locale'
import { defineCopy, type Locale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: { label: 'English', ariaLabel: 'Switch to English', short: 'EN' },
  en: { label: 'العربية', ariaLabel: 'التبديل إلى العربية', short: 'ع' },
})

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const changeLocale = useChangeLocale()
  const copy = COPY[locale]
  const nextLocale: Locale = locale === 'ar' ? 'en' : 'ar'

  return (
    <button
      type="button"
      onClick={() => changeLocale(nextLocale)}
      aria-label={copy.ariaLabel}
      title={copy.ariaLabel}
      lang={nextLocale === 'ar' ? 'ar' : 'en'}
      className={cn(
        'text-muted-foreground hover:bg-surface-tint hover:text-primary inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors duration-200',
        className,
      )}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{copy.label}</span>
      <span className="sm:hidden">{copy.short}</span>
    </button>
  )
}
