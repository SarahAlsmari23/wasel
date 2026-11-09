import { intlLocaleFor, type Locale } from '@/lib/i18n/config'

/*
 * Every formatter takes the active locale (Arabic by default) so dates and
 * numbers follow the interface language: ar-SA for Arabic, en-GB for English.
 */

export function formatDate(iso: string, locale: Locale = 'ar'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(intlLocaleFor(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(iso: string, locale: Locale = 'ar'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(intlLocaleFor(locale), { hour: '2-digit', minute: '2-digit' })
}

const RELATIVE_UNITS: { limitMs: number; divisorMs: number; unit: Intl.RelativeTimeFormatUnit }[] =
  [
    { limitMs: 60_000, divisorMs: 1_000, unit: 'second' },
    { limitMs: 3_600_000, divisorMs: 60_000, unit: 'minute' },
    { limitMs: 86_400_000, divisorMs: 3_600_000, unit: 'hour' },
    { limitMs: 2_592_000_000, divisorMs: 86_400_000, unit: 'day' },
    { limitMs: 31_536_000_000, divisorMs: 2_592_000_000, unit: 'month' },
    { limitMs: Infinity, divisorMs: 31_536_000_000, unit: 'year' },
  ]

export function formatRelativeTime(
  iso: string,
  locale: Locale = 'ar',
  now: number = Date.now(),
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const deltaMs = date.getTime() - now
  const absoluteMs = Math.abs(deltaMs)
  const formatter = new Intl.RelativeTimeFormat(intlLocaleFor(locale), { numeric: 'auto' })

  for (const { limitMs, divisorMs, unit } of RELATIVE_UNITS) {
    if (absoluteMs < limitMs) {
      return formatter.format(Math.round(deltaMs / divisorMs), unit)
    }
  }

  return formatDate(iso, locale)
}

export function formatNumber(value: number, locale: Locale = 'ar'): string {
  return new Intl.NumberFormat(intlLocaleFor(locale)).format(value)
}
