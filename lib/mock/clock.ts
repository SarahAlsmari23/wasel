/**
 * Mock records are timestamped relative to when the module is first loaded so
 * the demo always reads naturally ("قبل ساعتين") instead of drifting into
 * "قبل ستة أشهر" as the fixture dates age.
 *
 * Safe against hydration mismatches because every mock is read in a server
 * component and passed down as props — the browser never re-derives these.
 */
const NOW = Date.now()

const HOUR_MS = 60 * 60 * 1000

export function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR_MS).toISOString()
}

export function daysAgo(days: number): string {
  return hoursAgo(days * 24)
}

/** Date-only form (YYYY-MM-DD) for "when did the problem happen" fields. */
export function dateDaysAgo(days: number): string {
  return daysAgo(days).slice(0, 10)
}
