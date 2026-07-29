import { isFuzzyPhraseMatch, normalizeArabicInput } from '@/lib/ai/arabic-normalize'

/**
 * Detects, in the browser, that the user is explicitly asking Wasal to produce
 * the complaint ("أنشئ البلاغ", "اكتب الشكوى", "أبغى أقدم بلاغ", …).
 *
 * This is a UX affordance only: it decides *when* to offer the create-complaint
 * call to action inside the conversation. It does not alter the assistant's
 * prompts, the retrieval pipeline, or the complaint generation logic — those
 * still run exactly as before once the user opts in.
 *
 * Phase 7.2B: all matching below runs against a *normalized* copy of the
 * message (lib/ai/arabic-normalize.ts) — letter variants, diacritics, and
 * exaggerated repeated letters collapsed — so the same phrase list already
 * covers spelling variants without needing every literal form spelled out.
 * The caller's original string is never touched; this function only ever
 * returns a boolean.
 */

// Verbs that express "make/write/submit/prepare" … (normalized forms; e.g.
// "اعمل" also matches "اعملي" as a substring, so feminine/plural suffixes
// don't need their own entries).
const ACTION_PATTERN =
  /(انشئ|اعمل|اكتب|جهز|حرر|صغ|صياغه|اسوي|سوي|ابدا|قدم|اقدم|اريد|ابغي|ابي|ارفع|ودي|بدي|نبي|محتاج|احتاج)/

// … applied to a complaint noun.
const OBJECT_PATTERN = /(بلاغ|شكوي|معروض|اعتراض)/

/**
 * Phrases that are unambiguous on their own, so they match even when the verb
 * and the noun are split across a longer sentence.
 */
const DIRECT_PATTERNS = [
  /انشئ\s*(لي\s*)?(ال)?بلاغ/,
  /اكتب\s*(لي\s*)?(ال)?(بلاغ|شكوي)/,
  /جهز\s*(لي\s*)?(ال)?(بلاغ|شكوي)/,
  /صغ\s*(لي\s*)?(ال)?(بلاغ|شكوي)/,
  /(اريد|ابغي|ابي|ودي|بدي)\s*(ان\s*)?(اقدم|تقديم|رفع|ارفع)\s*(ال)?(بلاغ|شكوي)/,
  /(اريد|ابغي|ابي|ودي|بدي|اسوي|سوي)\s*(اشتكي|اعترض)/,
  /تقديم\s*(ال)?(بلاغ|شكوي)/,
  /رفع\s*(ال)?(بلاغ|شكوي)/,
  /ارفع\s*(ال)?(بلاغ|شكوي)/,
  /create\s+(the\s+)?complaint/i,
  /file\s+(a\s+)?complaint/i,
]

/** Short canonical phrases for controlled fuzzy matching only — small typos
 * in an otherwise-unambiguous explicit request ("ابغغغغى اشتكي", "سوي لي
 * بلااااغ" — already collapsed by normalization — plus a genuine 1-2
 * character slip). Never used for anything longer or more ambiguous than
 * these fixed, short phrases. */
const FUZZY_COMPLAINT_PHRASES = [
  'ابي اشتكي',
  'ابغي اشتكي',
  'ودي اشتكي',
  'اريد اشتكي',
  'ابي اعترض',
  'ارفع شكوي',
  'اقدم شكوي',
  'اسوي بلاغ',
  'انشئ بلاغ',
].map(normalizeArabicInput)

/** Questions *about* complaints that must not be mistaken for a request.
 * Deliberately anchored on "start of message + word boundary via explicit
 * whitespace/end", never `\b` — `\b` does not recognize Arabic letters as
 * word characters in JS regex, so it silently never matches Arabic text at
 * all (the same gotcha fixed in lib/ai/intent-guards.ts's out-of-scope
 * sports pattern during Phase 7.1). */
const QUESTION_PATTERN = /^\s*(كيف|ما|ماذا|متي|اين|هل|وش|ايش|كم)(\s|$)/

export function wantsToCreateComplaint(rawMessage: string): boolean {
  const message = normalizeArabicInput(rawMessage)
  if (message === '') return false

  if (DIRECT_PATTERNS.some((pattern) => pattern.test(message))) {
    // "كيف أقدم شكوى؟" is a request for guidance, not for the builder.
    return !QUESTION_PATTERN.test(message)
  }

  if (QUESTION_PATTERN.test(message)) return false

  if (ACTION_PATTERN.test(message) && OBJECT_PATTERN.test(message)) return true

  return isFuzzyPhraseMatch(message, FUZZY_COMPLAINT_PHRASES)
}

/**
 * Phase 7.4, Part 2 (expanded in Phase 7.4B) — whole-message "just continue"
 * fillers sent while a complaint is already active (e.g. after being told to
 * wait, or simply acknowledging the assistant's last message). Before this
 * guard, any such message was merged verbatim as the *answer* to whatever
 * field happened to be pending — silently corrupting that field with the
 * literal word "كمل"/"تم"/etc. and then permanently blocking the real
 * question from ever being asked again (the field now looks "already
 * answered"). Matched only as the entire normalized message, never a
 * substring — a real answer that merely contains one of these words
 * elsewhere must still be treated as a genuine answer.
 *
 * Phase 7.4B adds variants that themselves mention "الشكوى"/"البلاغ"/
 * "المشكلة" ("خل نكمل على الشكوى", "نرجع للبلاغ", "أبي أكمل المشكلة") —
 * these read like grievance language on their own, which is exactly why
 * `isExplicitRoutingChange` below deliberately does NOT treat a bare mention
 * of "شكوى"/"بلاغ" as sufficient to unlock routing; here, they are still
 * ordinary continuation fillers, not new information.
 */
const CONTINUATION_FILLER_PHRASES = [
  'كمل',
  'كمّل',
  'نكمل',
  'خل نكمل',
  'خل نكمل شكواي',
  'خل نكمل على الشكوى',
  'كمل شكواي',
  'كمل على الشكوى',
  'نرجع للشكوى',
  'نرجع للبلاغ',
  'واصل',
  'خل نواصل',
  'تابع',
  'استمر',
  'تمام كمل',
  'طيب نكمل',
  'أبي أكمل',
  'أبي أكمل المشكلة',
  'تم',
  'اوكي',
  'طيب',
].map(normalizeArabicInput)

export function isComplaintContinuationFiller(rawMessage: string): boolean {
  const message = normalizeArabicInput(rawMessage)
  if (message === '') return false
  if (CONTINUATION_FILLER_PHRASES.includes(message)) return true
  return isFuzzyPhraseMatch(message, CONTINUATION_FILLER_PHRASES)
}

/**
 * Phase 7.4B, Part 1 — strict routing lock. `hasGrievanceSignal` (a bare
 * mention of "شكوى"/"بلاغ"/"مشكلة"/etc., lib/ai/intent-guards.ts) turned out
 * to be far too broad a signal to allow replacing an already-saved routing
 * decision: ordinary continuation phrases ("خل نكمل على الشكوى", "نرجع
 * للبلاغ") mention exactly those words without expressing any new
 * information at all, so gating the routing override on `hasGrievanceSignal`
 * let a filler word silently re-open routing. This guard instead requires
 * one of two much narrower, unambiguous signals:
 *
 * 1. An explicit correction — the user directly names the entity/topic/
 *    problem as wrong ("أقصد …") or contrasts it with something else
 *    ("الجهة مو …", "المشكلة … وليس …").
 * 2. An explicit request for a new/separate complaint ("شكوى ثانية", "بلاغ
 *    جديد", "غير موضوع البلاغ") — never a bare "بلاغ"/"شكوى" alone.
 */
const CORRECTION_SUBJECT_PATTERN = /الجهه|الموضوع|المشكله/
const CORRECTION_CONTRAST_PATTERN = /وليس|ليست|ليس(\s|$)|(^|\s)(مو|مب|مش)(\s|$)/
const MEANING_CORRECTION_PATTERN = /اقصد/

function isExplicitCorrection(normalized: string): boolean {
  if (MEANING_CORRECTION_PATTERN.test(normalized)) return true
  return CORRECTION_SUBJECT_PATTERN.test(normalized) && CORRECTION_CONTRAST_PATTERN.test(normalized)
}

const NEW_COMPLAINT_NOUN_PATTERN = /بلاغ|شكوي/
const NEW_COMPLAINT_MARKER_PATTERN = /ثاني|اخرى|اخر(\s|$)|جديد/
const CHANGE_TOPIC_PATTERN = /غير\s*(موضوع|محتوي|نوع)\s*(ال)?(بلاغ|شكوي)/

function isNewComplaintRequest(normalized: string): boolean {
  if (CHANGE_TOPIC_PATTERN.test(normalized)) return true
  return (
    NEW_COMPLAINT_NOUN_PATTERN.test(normalized) && NEW_COMPLAINT_MARKER_PATTERN.test(normalized)
  )
}

/**
 * The one deterministic gate allowed to displace an already-saved routing
 * decision (entityId/serviceId/complaintTypeId) mid-complaint. `false` for
 * every ordinary answer, side question, or continuation filler — including
 * ones that mention "شكوى"/"بلاغ" in passing.
 */
export function isExplicitRoutingChange(rawMessage: string): boolean {
  const normalized = normalizeArabicInput(rawMessage)
  if (normalized === '') return false
  return isExplicitCorrection(normalized) || isNewComplaintRequest(normalized)
}

/** The assistant's reply when it offers to build the complaint. */
export const COMPLAINT_CTA_MESSAGE = `أصبحت الشكوى جاهزة تقريباً.

لإنشاء البلاغ وحفظه في حسابك، اضغط على الزر أدناه.`
