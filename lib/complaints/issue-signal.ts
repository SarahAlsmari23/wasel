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
  // Emergency release fix — "قطع" as a bare substring does NOT match every
  // conjugation: "انقطاع" (ا-ن-ق-ط-ا-ع) and "مقطوع" (م-ق-ط-و-ع) both have a
  // letter between ط and ع, breaking the substring, even though both are
  // extremely common, central ways to describe an outage (in fact the exact
  // wording of this app's own telecom clarifying question below). "توقف"
  // (stopped) and "ما يشتغل"/"ما يعمل" (not working) are entirely different
  // roots, not covered by "قطع" at all. All added explicitly rather than
  // relying on one substring to carry every inflection.
  telecom:
    /قطع|انقطاع|مقطوع|توقف|ما\s*(يشتغل|يعمل)|ضعف|ضعيف|بطء|بطيء|تغطي|اشاره|سيئ|فاتوره|فواتير|مبلغ غير صحيح|خصم زائد|تم احتساب مبلغ اضافي/,
  // Phase 7.7, Part 5 — extended with the additional targeted-question
  // categories the spec itself lists (منتج/طلب/استبدال/خدمة/إعلان مضلل),
  // alongside the categories already covered from Phase 7.6.
  //
  // Phase 8, Part 2/12 — further extended with common colloquial phrasing
  // that expresses the exact same categories without the more formal words
  // above: "خربان"/"مكسور" (broken, same meaning as "معيب"), "رجعوا"/"فلوس"
  // (a refund never came back — "ما رجعوا فلوسي"), and an elapsed-time
  // pattern ("الشحنة لها أسبوعين") that implies a delivery delay without any
  // explicit negation word at all — a duration attached to "لها" (has been
  // [duration]) said about an order/shipment is itself the signal.
  // Emergency release fix — "لها مدة" (a generic, unit-less duration) added
  // alongside the already-covered specific units ("لها أسبوعين").
  // Emergency release fix — "شحنه" added bare: "الشحنة ما وصلت" names
  // neither "طلب" nor "تسليم" nor "تاخر" at all, only "الشحنة" itself.
  commerce:
    /معيب|تالف|عيب|استرجاع|استرداد|ارجاع|استعاده|تسليم|تاخر|مبلغ|رفض|استبدال|منتج|طلب|شحنه|خدمه|مضلل|خربان|مكسور|تكسر|فلوس|رجعوا|لها\s*(مده|يوم|يومين|اسبوع|اسبوعين|شهر|شهرين)/,
}

/** Only defined for the sectors this phase's live-verified scenarios cover
 * (telecom/commerce) — a sector with no entry here never triggers the
 * clarification gate at all (route.ts skips it), matching the given spec
 * exactly rather than guessing patterns for the other three sectors. */
/*
 * Evaluation (evals/, live baseline): the gate asked "what exactly is the
 * problem?" after users had already said it — "خدمة الإنترنت بطيئة جداً"
 * ("بطيئة" normalises to "بطييه", which "بطيء" never matched), "النت فاصل",
 * and every English complaint (these patterns were Arabic-only). Added the
 * missing Arabic stems and an English equivalent per sector.
 */
const EXTRA_ARABIC_ISSUE_SIGNALS: Partial<Record<Sector, RegExp>> = {
  telecom: /بطي|فاصل|فصل|طافي|ما\s*يجيب|ما\s*تشتغل|خلصت|مسحوب|خصم|رصيد|الغاء|اشتراك|تحولني/,
  commerce: /وصل|غش|مقلد|نصب|نصاب|ضمان|سعر|تخفيض|وهمي|ما\s*رد|حظر|بلوك|غلط|ركبوه|تركيب|يصلح|صيانه/,
}
const ENGLISH_ISSUE_SIGNALS: Partial<Record<Sector, RegExp>> = {
  telecom:
    /\b(slow|outages?|down|cut|cutting|drop\w*|dead|died|no (signal|internet|service)|coverage|signal|bill\w*|charged|deducted|cancel\w*|subscription|not working)\b/i,
  commerce:
    /\b(refund\w*|deliver\w*|arriv\w*|defect\w*|faulty|fake|counterfeit|broken|damaged|charged|return\w*|warranty|exchange|order|scam\w*|blocked|overcharg\w*|price)\b/i,
}

export function hasSectorIssueSignal(sector: Sector, message: string): boolean {
  const pattern = SECTOR_ISSUE_SIGNAL_PATTERNS[sector]
  if (!pattern) return true
  const normalized = normalizeArabicInput(message)
  return (
    pattern.test(normalized) ||
    (EXTRA_ARABIC_ISSUE_SIGNALS[sector]?.test(normalized) ?? false) ||
    (ENGLISH_ISSUE_SIGNALS[sector]?.test(message) ?? false)
  )
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
