/**
 * The 5 real, fixed government-entity sectors this app ever routes to —
 * shared between the subject-line deriver (formal-letter.ts) and the
 * narrative rewriter (narrative.ts) so both classify the same entity name
 * into the same sector from one single source of truth.
 */
export type Sector = 'water' | 'telecom' | 'commerce' | 'municipality' | 'electricity'

/** Matches the exact entity names `resolveRouting`/`hydrateSavedRouting`
 * produce. An unrecognized name (should not happen in practice) simply
 * skips every sector-specific rule in both callers. */
export const ENTITY_NAME_TO_SECTOR: Record<string, Sector> = {
  'الشركة الوطنية للمياه': 'water',
  'هيئة الاتصالات والفضاء والتقنية': 'telecom',
  'وزارة التجارة': 'commerce',
  'وزارة البلديات والإسكان': 'municipality',
  'السعودية للطاقة': 'electricity',
}
