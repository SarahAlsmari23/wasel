'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  DEFAULT_LOCALE,
  directionFor,
  isLocale,
  LOCALE_COOKIE,
  type Copy,
  type Locale,
} from '@/lib/i18n/config'

type LocaleState = {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** The locale of the server-rendered tree most recently committed. */
  committedServerLocale: RefObject<Locale>
}

const LocaleContext = createContext<LocaleState>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  committedServerLocale: { current: DEFAULT_LOCALE },
})

function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return value && isLocale(value) ? value : null
}

/**
 * Holds the interface language on the client. Every component's copy for
 * both languages is already in the browser (see `defineCopy`), so switching
 * re-renders client components immediately, without waiting for the server.
 * Server-rendered text follows when the background refresh lands (see
 * useChangeLocale), which also brings a new `locale` prop.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [current, setCurrent] = useState(locale)
  const [serverLocale, setServerLocale] = useState(locale)
  const committedServerLocale = useRef(locale)

  // Runs only when a server render carrying this prop is actually committed.
  useEffect(() => {
    committedServerLocale.current = locale
  }, [locale])

  // Adopt a new server value only when it matches the latest choice: a slow
  // refresh started before a second switch must not flip the language back.
  if (locale !== serverLocale) {
    setServerLocale(locale)
    if (typeof document === 'undefined' || (readLocaleCookie() ?? locale) === locale) {
      setCurrent(locale)
    }
  }

  return (
    <LocaleContext.Provider
      value={{ locale: current, setLocale: setCurrent, committedServerLocale }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

export function useSetLocale(): (locale: Locale) => void {
  return useContext(LocaleContext).setLocale
}

export function useCommittedServerLocale(): RefObject<Locale> {
  return useContext(LocaleContext).committedServerLocale
}

export function readLocaleCookieValue(): Locale | null {
  return readLocaleCookie()
}

export function useDirection(): 'rtl' | 'ltr' {
  return directionFor(useLocale())
}

/** Resolves a component's co-located copy for the active locale. */
export function useCopy<T>(copy: Copy<T>): T {
  return copy[useLocale()]
}
