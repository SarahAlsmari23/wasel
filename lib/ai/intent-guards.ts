import type { ChatIntent } from '@/types/ai'
import {
  hasTokenFromGroup,
  isFuzzyPhraseMatch,
  normalizeArabicInput,
  tokenizeNormalized,
} from '@/lib/ai/arabic-normalize'

/**
 * Deterministic, server-authoritative intent guards (Phase 7.1). These never
 * call the model and never depend on RAG — they exist specifically so an
 * obvious case (identity question, blatant off-topic request) is classified
 * correctly even when the model would have gotten it wrong, and so a
 * genuinely ambiguous message is never short-circuited away from the real
 * RAG/model pipeline it needs. The model remains responsible for the
 * genuinely nuanced classification (entity_information vs.
 * government_service_question vs. complaint_guidance vs. out_of_scope) —
 * these guards only ever narrow that responsibility, never replace it.
 *
 * Phase 7.3: identity matching is token-based, not phrase-based (Part 2).
 * The message is normalized (lib/ai/arabic-normalize.ts), split into tokens,
 * and classified as identity only when it contains a token from BOTH a
 * "who" group (من/مين/منو/وش/ايش/ما) AND a "you/yourself" group
 * (انت/نفسك/تسوي/تعرف/واصل/تطبيق) — never from either group alone (Part 5:
 * "مين" by itself is not identity). Each group allows small bounded typo
 * tolerance ("ميين"/"مييييين"/"معيين"/"ممين" → مين), but only for short
 * messages (see hasTokenFromGroup) — this is what keeps "مين الجهة المختصة
 * بشكوى المياه؟" and "عندي مشكلة مع شركة زين" from false-matching: even
 * though "زين" is one substitution away from "مين", nothing in either
 * sentence also fuzzy-matches the "you" group, so the AND-requirement fails
 * and neither is classified as identity. A small supplementary exact/fuzzy
 * phrase list covers the handful of idioms ("كيف تساعدني") that don't
 * decompose into this two-group shape. The original message string is never
 * mutated; normalization/tokenization are purely internal classification
 * aids.
 */

const IDENTITY_WHO_TOKENS = ['من', 'مين', 'منو', 'وش', 'ايش', 'ما']
const IDENTITY_YOU_TOKENS_FUZZY = ['انت', 'نفسك', 'تسوي', 'تعرف', 'تطبيق']
// "واصل" is excluded from fuzzy tolerance (Phase 7.4B) — it's also the
// common Arabic verb root "وصل/تواصل" (arrive/contact), so a bounded-typo
// match against it collides with completely unrelated real answers built on
// that root: "تواصلت" (a genuine prior_provider_contact answer) is within
// edit-distance 2 of "واصل" and contains it as an in-order subsequence,
// which made "ما تواصلت" false-positive as an identity question (confirmed
// live during Phase 7.4B verification — it swallowed the boolean answer
// instead of merging it). An exact match still catches "مين واصل؟"/"وش هو
// واصل؟"; only bounded-typo tolerance on this one token is removed.
const IDENTITY_YOU_TOKENS_EXACT_ONLY = ['واصل']

// A handful of identity idioms that don't reduce to "who token + you token"
// (e.g. "كيف تساعدني" pairs a generic "how" with a verb, not a pronoun) —
// kept as an explicit, short supplementary phrase list rather than widening
// the token groups above with words ("كيف") common to many informational
// questions too.
const IDENTITY_EXTRA_PHRASES = [
  'كيف تساعدني',
  'كيف تقدر تساعدني',
  'كيف ممكن تقدر تساعدني',
  'كيف ممكن تساعدني',
  'عرفني بنفسك',
  'عرفني نفسك',
  'عرفني علي نفسك',
  'عرف بنفسك',
  'ممكن تعرفني',
  'ممكن تعرفني على نفسك',
]

const MAX_TOKENS_FOR_FUZZY_IDENTITY = 6

// English fallback (Phase 7.3, Part 8 explicitly requires "Who are you").
// Arabic-only normalization doesn't touch Latin text, so this is checked
// against a separately lower-cased copy.
const ENGLISH_IDENTITY_PATTERN = /^\s*who\s+are\s+you\s*\??\s*$/i

export function isIdentityQuestion(message: string): boolean {
  if (ENGLISH_IDENTITY_PATTERN.test(message)) return true

  const normalized = normalizeArabicInput(message)
  const tokens = tokenizeNormalized(normalized)
  const allowFuzzy = tokens.length > 0 && tokens.length <= MAX_TOKENS_FOR_FUZZY_IDENTITY

  const hasWho = hasTokenFromGroup(tokens, IDENTITY_WHO_TOKENS, allowFuzzy)
  const hasYou =
    hasTokenFromGroup(tokens, IDENTITY_YOU_TOKENS_FUZZY, allowFuzzy) ||
    hasTokenFromGroup(tokens, IDENTITY_YOU_TOKENS_EXACT_ONLY, false)
  if (hasWho && hasYou) return true

  if (IDENTITY_EXTRA_PHRASES.some((phrase) => normalized.includes(phrase))) return true
  return isFuzzyPhraseMatch(normalized, IDENTITY_EXTRA_PHRASES)
}

// Phase 7.3, Part 8 — exact fixed wording.
export const IDENTITY_RESPONSE = `أنا واصل، مساعدك الذكي للاستفسارات الحكومية والشكاوى والبلاغات.

أساعدك في فهم الخدمات الحكومية، وتحديد الجهة المختصة، والإجابة عن الاستفسارات، وتجهيز الشكاوى والبلاغات بصيغة رسمية عند الحاجة.`

/**
 * Only the most unambiguous, unmistakably off-topic patterns — math
 * problems, recipes, sports results, code requests, medical diagnosis.
 * Deliberately narrow: a real Saudi government-service question must never
 * be caught here just because it doesn't match a known keyword (that
 * decision belongs to the model + the routing-confidence safety net in
 * route.ts, never to a blocklist). Written in normalized form (ة→ه, أ/إ/آ→ا,
 * ى→ي) and matched against a normalized copy of the message — no fuzzy
 * matching here (Phase 7.2B keeps controlled fuzzy matching limited to the
 * identity and explicit-complaint-creation phrase sets, where the short,
 * fixed canonical list keeps false-positive risk low; these patterns are
 * longer/more varied and don't need it).
 */
const OUT_OF_SCOPE_PATTERNS = [
  /معادله\s*رياضي|حل\s*لي\s*معادل|كم\s*(ناتج|حاصل)|\d+\s*[+\-*×÷/]\s*\d+/,
  /وصفه\s*(طعام|اكل|كيك|حلا|طبخ)|طريقه\s*عمل\s*(ال)?(كيك|اكل|طبخ)/,
  /من\s+فاز|نتيجه\s*(ال)?مباراه|هدف\s*(ال)?مباراه|الدوري\s*(ال)?سعودي\s*لكره/,
  /اكتب\s*(لي\s*)?كود|اكتب\s*(لي\s*)?برنامج|بايثون|جافا\s*سكريبت|javascript|python\s*code/i,
  /تشخيص\s*(طبي|مرض)|اعراض\s*مرض|عندي\s*مرض/,
]

export function isObviousOutOfScope(message: string): boolean {
  const normalized = normalizeArabicInput(message)
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export const OUT_OF_SCOPE_RESPONSE =
  'عذرًا، لا يمكنني الإجابة عن هذا السؤال. أنا مختص بالاستفسارات والخدمات الحكومية وتوجيه الشكاوى والبلاغات إلى الجهة المناسبة.'

export const NO_VERIFIED_INFO_RESPONSE =
  'لا تتوفر لدي حالياً معلومات موثوقة ومحدثة عن ذلك. يمكنك التحقق من الموقع الرسمي للجهة.'

/**
 * Phase 7.3, Part 7 — a standalone greeting ("السلام عليكم", "صباح الخير", …)
 * gets one fixed, natural reply, deterministically, with no RAG/model call —
 * the same treatment as identity/out-of-scope. Deliberately only fires when
 * the message is *essentially just* the greeting (nothing substantive left
 * over once the greeting phrase is removed) — "مرحبا، ابي أجدد رخصتي" must
 * fall through to the real question, not get swallowed by a greeting reply.
 * No exact wording was mandated for this response (unlike the identity text
 * in Part 8); the wording below is a reasonable, brand-consistent choice.
 */
const GREETING_PHRASES = [
  'السلام عليكم',
  'وعليكم السلام',
  'هلا',
  'ياهلا',
  'ياهلا ومرحبا',
  'مرحبا',
  'صباح الخير',
  'مساء الخير',
]

export const GREETING_RESPONSE = 'أهلاً وسهلاً بك في واصل! كيف أقدر أساعدك اليوم؟'

export function isGreetingOnly(message: string): boolean {
  const normalized = normalizeArabicInput(message)
  if (normalized === '') return false

  // Whole-message equality (never substring) — "مرحبا، ابي أجدد رخصتي" must
  // never be swallowed by the greeting reply just for containing "مرحبا".
  if (GREETING_PHRASES.includes(normalized)) return true

  // Emergency Fix #2, Part 6 — a bare "لا" is only 1 edit away from "هلا"
  // (insert one leading letter), so the fuzzy check below previously
  // classified a plain "no" answer to a boolean complaint field (e.g. "هل
  // تواصلت مع مزود الخدمة سابقاً؟") as a greeting — injecting the full fixed
  // welcome reply mid-conversation instead of merging the answer. Live-
  // reproduced during this phase's own test matrix. A message the shared
  // boolean classifier can confidently read as yes/no is never a greeting,
  // regardless of context, exactly like isLikelySideQuestion's existing
  // boolean-shape exception below.
  if (parseBooleanAnswer(normalized) !== null) return false

  return isFuzzyPhraseMatch(normalized, GREETING_PHRASES)
}

/**
 * A soft signal only — used to decide whether a message is allowed to
 * *bypass* the identity/out-of-scope pre-guards above (Phase 7.1, Part 7:
 * explicit complaint intent must never be swallowed by an identity or
 * out-of-scope short-circuit in a mixed message). Never used on its own to
 * decide the final intent — that's still the model + routing-confidence
 * safety net, for anything not already covered by the deterministic guards
 * above.
 */
// Phase 7.7, Part 4/9 — "انقطع" (covers "انقطعت"/"انقطعوا"/etc., the common
// past-tense phrasing of "cut off") was missing: only the present-tense
// "منقطع"/"ينقطع" were covered, so an entirely ordinary complaint opener like
// "انقطعت عني المياه" never registered as a grievance at all, which kept the
// missing-fields/complaint-collection flow from ever activating even once
// routing correctly resolved the entity.
//
// Phase 8, Part 2/12 — "قطعوا" (a transitive "they cut it off", distinct from
// the reflexive "انقطع"/"منقطع" forms already covered — "قطعوا الخدمة" after
// paying a bill is a very common real phrasing) and "وصل"/"وصلت" added to
// the negated-verb group (covers "الطلب ما وصل" — an order that never
// arrived). "خربان"/"مكسور" are colloquial for "broken" — "كسر" alone does
// not match "مكسور" (the extra و breaks the substring).
// Emergency release fix — "لم" added alongside "ما" as a negation particle
// ("لم يصل الطلب" — an order that never arrived, using the more formal
// negation instead of the colloquial "ما").
const GRIEVANCE_SIGNAL_PATTERN =
  /أشتكي|اشتكي|شكوى|شكوي|بلاغ|اعتراض|اعترض|مشكل[ةه]|منقطع|ينقطع|انقطع|قطعوا|توقف|(ما|لم)\s*(يشتغل|يعمل|رجع|يرد|رجعوا|ردوا|وصل|وصلت|تصل)|رفضوا|رفض\s*طلبي|تأخر|حفر[ةه]|غير\s*صحيح|مرتفع[ةه]?|تسرب|كسر|خربان|مكسور|عطل|خلل|تعطل/

export function hasGrievanceSignal(message: string): boolean {
  return GRIEVANCE_SIGNAL_PATTERN.test(message)
}

const VALID_MODEL_INTENTS = new Set<ChatIntent>([
  'entity_information',
  'government_service_question',
  'complaint_guidance',
  'create_complaint',
  'identity_question',
  'out_of_scope',
])

/** Maps whatever the model returned for `intent` onto a known, valid value —
 * a model response with an unrecognized/malformed intent string must never
 * propagate as-is; it defaults to the safest informational category rather
 * than being trusted blindly (server-authoritative, never "whatever Gemini
 * said"). */
export function coerceModelIntent(raw: string): ChatIntent {
  return VALID_MODEL_INTENTS.has(raw as ChatIntent)
    ? (raw as ChatIntent)
    : 'government_service_question'
}

export function isComplaintIntent(intent: ChatIntent): boolean {
  return (
    intent === 'complaint_guidance' ||
    intent === 'create_complaint' ||
    intent === 'complaint_side_question'
  )
}

export function isInformationalIntent(intent: ChatIntent): boolean {
  return intent === 'entity_information' || intent === 'government_service_question'
}

/**
 * Phase 7.2, Part 5 — deterministic answer-vs-question guard. Shared by both
 * the client (components/wasal/wasal-chat.tsx, before ever merging a message
 * into collectedFields) and the server (app/api/ai/chat/route.ts, as an
 * authoritative re-check against the real resolved pending field) — a single
 * source of truth, never two independent implementations.
 *
 * A message is only ever considered a side question when it's actually
 * shaped like one (a question mark or a leading question word) — brevity
 * alone never qualifies ("لا", "STC", "الرياض" are never side questions).
 * The one exception runs the other way: a well-formed yes/no answer to a
 * boolean-shaped field is never reclassified as a side question merely
 * because it carries a trailing "؟" (e.g. a hesitant "لا؟").
 */
export type FieldAnswerShape = 'boolean' | 'city' | 'provider' | 'merchant' | 'number' | 'free_text'

const FIELD_SHAPE_BY_KEY: Record<string, FieldAnswerShape> = {
  city: 'city',
  service_provider: 'provider',
  merchant_name: 'merchant',
  prior_provider_contact: 'boolean',
  account_or_meter_number: 'number',
  bill_reference: 'number',
  previous_report_number: 'number',
}

export function inferFieldAnswerShape(fieldKey: string): FieldAnswerShape {
  return FIELD_SHAPE_BY_KEY[fieldKey] ?? 'free_text'
}

const QUESTION_MARK_PATTERN = /[؟?]/
// Anchored on explicit whitespace/end-of-string, never `\b` — `\b` does not
// recognize Arabic letters as word characters in JS regex, so it silently
// never matched real Arabic text at all before this fix (confirmed: this
// pattern never fired on any question lacking a literal "؟"/"?"). Run
// against a normalized copy so missing diacritics/letter variants/repeated
// letters ("وشش", "كيففف") don't defeat it either.
const QUESTION_WORD_PATTERN = /^\s*(هل|متي|كيف|لماذا|ليه|وش|ايش|ما\s+هي|ما\s+هو|كم|وين|اين)(\s|$)/

/**
 * Phase 7.4, Part 1 (expanded Phase 7.6, Part 1) — whole-message Saudi
 * colloquial forms of a yes/no answer to a boolean-shaped complaint field
 * (e.g. "هل سبق أن تواصلت مع مزود الخدمة؟"). Deliberately never inferred from
 * "نعم"/"لا" alone: real answers routinely carry the same meaning without
 * either word ("ما تواصلت", "سبق وتواصلت", "للحين لا"). Matched only as the
 * *entire* normalized message (never a substring), with the same bounded typo
 * tolerance (isFuzzyPhraseMatch) already used for
 * GREETING_PHRASES/IDENTITY_EXTRA_PHRASES above — never both lists at once,
 * since no phrase appears in both.
 */
const FALSE_ANSWER_PHRASES = [
  'لا',
  'ابداً',
  'ما',
  'ما تواصلت',
  'ماتواصلت',
  'ما قد تواصلت',
  'ماقد تواصلت',
  'ما سبق',
  'ماني متواصل',
  'ما رفعت',
  'ما رفعت لهم',
  'مارفعت لهم',
  'ما كلمتهم',
  'ماكلمتهم',
  'لا والله',
  'للحين لا',
  'ما قدمت',
  'ماقدمت',
  'ما تابعت',
  'ماتابعت',
  'ما عندي رقم مرجعي',
  'ماعندي رقم مرجعي',
  'ما سبق وتواصلت',
  'ماسبق وتواصلت',
  // Phase 8, Part 12 — explicitly listed in the spec alongside "لا"/"ابدا".
  'ولا مرة',
  'ولا مره',
].map(normalizeArabicInput)

const TRUE_ANSWER_PHRASES = [
  'نعم',
  'اي',
  'ايوه',
  'ايه',
  'تواصلت',
  'تواصلت معهم',
  'كلمتهم',
  'رفعت لهم',
  'قدمت',
  'فتحت بلاغ',
  'عندي رقم مرجعي',
  'سبق وتواصلت',
  'سبق رفعت لهم شكوى',
].map(normalizeArabicInput)

/** Space-insensitive membership check — "ماتواصلت"/"ما تواصلت" must resolve
 * identically regardless of which spacing the user (or an older stored row)
 * happens to use (Phase 7.6, Part 1: "support Arabic variants with and
 * without spaces"), without needing every spacing permutation spelled out in
 * the phrase lists above. */
function stripSpaces(value: string): string {
  return value.replace(/\s+/g, '')
}

/** Exact match, ignoring spacing only — never fuzzy. Kept separate from
 * fuzzy matching below: a short negation prefix ("ما"/"لا") is only 1-2
 * characters, well within the bounded typo tolerance `isFuzzyPhraseMatch`
 * allows, so an affirmative phrase and its own negated counterpart
 * ("عندي رقم مرجعي" vs "ما عندي رقم مرجعي") can genuinely sit within fuzzy
 * range of each other — confirmed live during Phase 7.6 verification,
 * where "عندي رقم مرجعي" fuzzy-matched the *negative* "ماعندي رقم مرجعي"
 * before its own exact, unambiguous membership in the positive list was
 * ever checked. Checking every list's exact/compact match first, before
 * either list's fuzzy match is attempted, guarantees a genuine exact hit
 * can never be overridden by a coincidental fuzzy hit on the opposite list.
 */
function matchesExactOrCompact(normalized: string, phrases: string[]): boolean {
  if (phrases.includes(normalized)) return true
  const compact = stripSpaces(normalized)
  return phrases.some((phrase) => stripSpaces(phrase) === compact)
}

/**
 * Deterministic yes/no classifier for a boolean-shaped complaint field
 * answer — the single canonical normalization path for `prior_provider_contact`
 * (Phase 7.6, Part 1). Also recognizes the field's own already-canonicalized
 * stored form ("true"/"false", case-insensitive — see wasal-chat.tsx, which
 * persists exactly this string once a raw answer is classified here), so a
 * previously normalized value round-trips through this same function on every
 * later read (display, letter generation, legacy resume) without being
 * re-guessed from scratch. Returns `null` (never a guess) when the message
 * doesn't clearly match either list — an ambiguous free-text answer is left
 * to whatever fallback the caller already has, never silently coerced to
 * true or false here.
 */
export function parseBooleanAnswer(message: string): boolean | null {
  const trimmedRaw = message.trim().toLowerCase()
  if (trimmedRaw === 'true') return true
  if (trimmedRaw === 'false') return false

  const normalized = normalizeArabicInput(message)
  if (normalized === '') return null
  if (matchesExactOrCompact(normalized, FALSE_ANSWER_PHRASES)) return false
  if (matchesExactOrCompact(normalized, TRUE_ANSWER_PHRASES)) return true
  if (isFuzzyPhraseMatch(normalized, FALSE_ANSWER_PHRASES)) return false
  if (isFuzzyPhraseMatch(normalized, TRUE_ANSWER_PHRASES)) return true
  return null
}

export function isLikelySideQuestion(content: string, pendingFieldKey: string): boolean {
  const trimmed = content.trim()
  if (trimmed === '') return false

  const normalized = normalizeArabicInput(trimmed)
  const looksLikeQuestion =
    QUESTION_MARK_PATTERN.test(trimmed) || QUESTION_WORD_PATTERN.test(normalized)
  if (!looksLikeQuestion) return false

  const shape = inferFieldAnswerShape(pendingFieldKey)
  if (shape === 'boolean' && parseBooleanAnswer(trimmed) !== null) {
    return false
  }

  return true
}

/** Phase 7.2, Part 6/8 — the one deterministic way a pending complaint
 * question is ever resumed after an interruption (side question, identity,
 * out-of-scope) — the exact wording the model produced (or the fixed
 * refusal/identity text) is never itself trusted to include it. */
export function appendPendingQuestion(baseAnswer: string, pendingQuestionText: string): string {
  return `${baseAnswer}\n\nوبالعودة إلى بلاغك، ${pendingQuestionText}`
}
