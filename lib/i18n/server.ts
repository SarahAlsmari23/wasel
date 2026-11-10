import { cookies } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale, type Copy, type Locale } from '@/lib/i18n/config'

/** The visitor's chosen locale, read from the preference cookie. Server-only. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value)
}

/** Resolves a component's co-located copy for the current request's locale. */
export async function getCopy<T>(copy: Copy<T>): Promise<T> {
  return copy[await getLocale()]
}
