/**
 * Phase 7.7, Part 4 — deterministic entity detection, independent of
 * RAG/embedding similarity. Real user messages like "انقطعت عني الموية وأنا
 * دافع الفاتورة" or "انقطعت إمدادات المياه رغم سداد الفاتورة" name the sector
 * unambiguously (المياه/الموية), but a short, conversational phrasing like
 * this doesn't always retrieve a strongly-similar knowledge document — RAG
 * confidence is a similarity measure, not a certainty-of-topic measure, and
 * the two can legitimately diverge for perfectly ordinary phrasing. Entity
 * identification should not depend on retrieval quality when the message
 * itself already contains an unambiguous, fixed keyword for the sector.
 *
 * This is a narrow, additive signal only: it never changes what
 * `resolveRouting` (RAG-based) returns, and it's only ever consulted by the
 * caller (app/api/ai/chat/route.ts) as a fallback when RAG resolution didn't
 * produce a routing at all, or landed at 'low' confidence — it never
 * overrides a trustworthy RAG match on its own. Because this app's
 * complaint types are currently one-per-entity (see lib/ai/routing.ts's
 * Part 5 fix), resolving the entity this way necessarily resolves the
 * service/complaintType along with it — that's a fact about the current
 * data, not something this module assumes generally: it never guesses which
 * complaintType, it just resolves the sector's single service the same way
 * lib/ai/routing.ts's resolveEntityByName always does (public-read lookup,
 * never invented ids).
 */

import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'
import { ENTITY_NAME_TO_SECTOR, type Sector } from '@/lib/complaints/sectors'

/** Fixed, unambiguous keywords per sector — deliberately narrow (a handful of
 * words that only ever mean this sector), never a broad/ambiguous term that
 * could misfire on an unrelated message. Matched as a substring against the
 * normalized message (ة→ه, أ/إ/آ→ا already folded in), so a single entry
 * here covers every definite-article/possessive form the word appears in. */
const SECTOR_KEYWORD_PATTERNS: Record<Sector, RegExp> = {
  // "الموية" (colloquial) and "المياه" (formal) — normalizeArabicInput leaves
  // both spellings distinct (different letter order), so both are listed.
  water: /مياه|مويه|صرف صحي/,
  telecom: /اتصالات|الانترنت|إنترنت|انترنت|تغطية الجوال/,
  commerce: /متجر|تاجر|بائع/,
  municipality: /بلديه|بلديات|رصيف|حفره في الشارع|نظافه عامه|قمامه/,
  electricity: /كهرباء|عداد الكهرباء/,
}

/** The single sector-to-entity-name mapping already used elsewhere
 * (lib/complaints/sectors.ts) is entity-name → sector; this is its reverse,
 * kept local since nothing outside this narrow fallback needs it. */
const SECTOR_TO_ENTITY_NAME = Object.fromEntries(
  Object.entries(ENTITY_NAME_TO_SECTOR).map(([entityName, sector]) => [sector, entityName]),
) as Record<Sector, string>

/**
 * Deterministic, keyword-only sector detection — no model call, no RAG, no
 * similarity threshold. Returns the first matching sector, or `null` when
 * nothing in the fixed keyword lists appears in the message at all (the
 * normal case for most messages, which continue to rely on RAG as before).
 */
export function detectSectorByKeyword(message: string): Sector | null {
  const normalized = normalizeArabicInput(message)
  for (const [sector, pattern] of Object.entries(SECTOR_KEYWORD_PATTERNS) as [Sector, RegExp][]) {
    if (pattern.test(normalized)) return sector
  }
  return null
}

export function getEntityNameForSector(sector: Sector): string {
  return SECTOR_TO_ENTITY_NAME[sector]
}
