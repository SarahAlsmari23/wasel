/**
 * Official authority names and their historical spellings.
 *
 * The water authority's own site names it «شركة المياه الوطنية»
 * (https://www.nwc.com.sa/ar, verified 2026-11-11); Wasel originally stored
 * «الشركة الوطنية للمياه». Both refer to the same authority (code `nwc`, same
 * row id). Every name read from the database or sent back by the browser
 * passes through `canonicalEntityName`, so the app behaves identically before
 * and after the reference-data rename (supabase/maintenance/nwc-name-2026-11),
 * and conversations started under the old name keep working. Stored letter
 * versions are historical documents and are never rewritten.
 */
export const WATER_AUTHORITY_NAME = 'شركة المياه الوطنية'
export const WATER_AUTHORITY_HISTORICAL_NAME = 'الشركة الوطنية للمياه'

/** historical name → current official name */
const HISTORICAL_TO_CURRENT: Record<string, string> = {
  [WATER_AUTHORITY_HISTORICAL_NAME]: WATER_AUTHORITY_NAME,
}

/** The current official name for any known historical spelling; other names unchanged. */
export function canonicalEntityName<T extends string | null | undefined>(name: T): T {
  if (!name) return name
  return (HISTORICAL_TO_CURRENT[name] ?? name) as T
}

/** Every stored spelling of the same authority (current first) — for database lookups by name. */
export function entityNameVariants(name: string): string[] {
  const current = canonicalEntityName(name)
  return [
    current,
    ...Object.entries(HISTORICAL_TO_CURRENT)
      .filter(([, to]) => to === current)
      .map(([from]) => from),
  ]
}

/** Historical spellings of an authority's current name. */
export function historicalNames(currentName: string): string[] {
  return entityNameVariants(currentName).slice(1)
}
