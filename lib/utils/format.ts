const DATE_LOCALE = 'ar-SA'

/** e.g. "٢٣ يوليو ٢٠٢٦" — used on cards and detail headers. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** e.g. "١٠:١٥" — message timestamps. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' })
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

/**
 * e.g. "قبل ساعتين". Rendered client-side only (see <RelativeTime />) because
 * it depends on the current clock and would otherwise cause hydration
 * mismatches between the server render and the browser.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const deltaMs = date.getTime() - now
  const absoluteMs = Math.abs(deltaMs)
  const formatter = new Intl.RelativeTimeFormat(DATE_LOCALE, { numeric: 'auto' })

  for (const { limitMs, divisorMs, unit } of RELATIVE_UNITS) {
    if (absoluteMs < limitMs) {
      return formatter.format(Math.round(deltaMs / divisorMs), unit)
    }
  }

  return formatDate(iso)
}

/** Arabic-Indic digits for statistics, so numerals match the surrounding text. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(DATE_LOCALE).format(value)
}
