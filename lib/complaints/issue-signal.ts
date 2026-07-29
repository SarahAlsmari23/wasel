/**
 * Phase 7.6, Part 4 — a message that only names a broad sector/entity
 * ("لدي مشكلة مع شركة اتصالات") must never have its specific issue subtype
 * treated as decided. Since this app's complaint types are one-per-entity
 * (not one-per-subtype — see the government_services/complaint_types data),
 * the entity/service/complaintType themselves resolve correctly the moment
 * the entity is identified; what must NOT happen yet is asking (or the model
 * narrating) about a specific problem_description before the user has said
 * anything specific at all. This module is the single deterministic check
 * for "has the user actually described a specific issue yet" — reused by
 * app/api/ai/chat/route.ts to decide whether to ask the fixed clarifying
 * question below instead of proceeding into normal field collection.
 *
 * Patterns are written against a normalized copy of the message
 * (lib/ai/arabic-normalize.ts) and match the shared Arabic *root* as a
 * substring rather than a fixed word form, so conjugated forms ("تنقطع",
 * "منقطعة") are recognized without enumerating every inflection — a plain
 * word list (as used by lib/complaints/narrative.ts for a different purpose:
 * picking a template clause from already-known text) is too narrow for a
 * user-facing gate and would loop forever on a phrasing it didn't expect.
 */

import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'
import type { Sector } from '@/lib/complaints/sectors'

const SECTOR_ISSUE_SIGNAL_PATTERNS: Partial<Record<Sector, RegExp>> = {
  telecom: /قطع|ضعف|ضعيف|بطء|بطيء|تغطي|اشاره|فاتوره|فواتير/,
  // Phase 7.7, Part 5 — extended with the additional targeted-question
  // categories the spec itself lists (منتج/طلب/استبدال/خدمة/إعلان مضلل),
  // alongside the categories already covered from Phase 7.6.
  commerce:
    /معيب|تالف|عيب|استرجاع|استرداد|ارجاع|استعاده|تسليم|تاخر|مبلغ|رفض|استبدال|منتج|طلب|خدمه|مضلل/,
}

/** Only defined for the sectors this phase's live-verified scenarios cover
 * (telecom/commerce) — a sector with no entry here never triggers the
 * clarification gate at all (route.ts skips it), matching the given spec
 * exactly rather than guessing patterns for the other three sectors. */
export function hasSectorIssueSignal(sector: Sector, message: string): boolean {
  const pattern = SECTOR_ISSUE_SIGNAL_PATTERNS[sector]
  if (!pattern) return true
  return pattern.test(normalizeArabicInput(message))
}

/** Exact, fixed clarifying questions — asked deterministically (no model
 * call) in place of jumping straight into `problem_description` collection
 * for a still-generic message. */
export const SUBTYPE_CLARIFICATION_QUESTIONS: Partial<Record<Sector, string>> = {
  telecom:
    'ما نوع المشكلة بالتحديد؟ هل تتعلق بانقطاع الخدمة، ضعف التغطية، الفاتورة، أو مشكلة أخرى؟',
  // Phase 7.7, Part 5 — a targeted multi-choice question, same shape as
  // telecom's, instead of the fully open-ended Phase 7.6 wording.
  commerce:
    'ما المشكلة التي واجهتها مع المتجر بالتحديد؟ هل تتعلق بمنتج، طلب، استرجاع، استبدال، خدمة، إعلان مضلل، أو تأخر في التسليم؟',
}
