'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_LOCALE, directionFor, type Copy, type Locale } from '@/lib/i18n/config'

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useDirection(): 'rtl' | 'ltr' {
  return directionFor(useLocale())
}

/** Resolves a component's co-located copy for the active locale. */
export function useCopy<T>(copy: Copy<T>): T {
  return copy[useLocale()]
}
