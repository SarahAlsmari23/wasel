/**
 * Locale configuration shared by server and client code.
 *
 * Arabic is the default and primary language. The active locale is persisted
 * in a first-party cookie (not the URL), so it survives navigation, refreshes,
 * sign-in, and the Google OAuth round trip without changing any route.
 */
export const LOCALES = ['ar', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'
export const LOCALE_COOKIE = 'wasel-locale'
/** One year — the choice is a preference, not a session detail. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** BCP 47 tag for the `<html lang>` attribute. */
export function htmlLangFor(locale: Locale): string {
  return locale === 'ar' ? 'ar-SA' : 'en'
}

/** Locale tag for Intl date/number formatting. */
/**
 * Arabic formatting uses Western digits (`nu-latn`) — the convention on Saudi
 * government portals, and consistent with the dashboard's figures — while
 * keeping ar-SA's month names and calendar.
 */
export function intlLocaleFor(locale: Locale): string {
  return locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB'
}

/**
 * Co-located, type-checked copy: every component declares its Arabic and
 * English strings side by side, and TypeScript rejects an English entry whose
 * shape differs from the Arabic one — a missing translation is a build error,
 * not a silent mixed-language screen.
 */
export type Copy<T> = { ar: T; en: NoInfer<T> }

export function defineCopy<T>(copy: Copy<T>): Copy<T> {
  return copy
}
