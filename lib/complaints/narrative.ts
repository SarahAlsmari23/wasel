/**
 * Deterministic, rule-based rewriting of the complaint body — no AI call, no
 * randomness, same input always yields the same output. Reads the full
 * conversation (every user message, not just `problem_description`) plus the
 * already-collected structured fields, and produces three professional
 * Arabic paragraphs (introduction / chronological explanation / requested
 * resolution) instead of copying the user's own wording verbatim.
 *
 * The intermediate facts extracted below (timing, payment status, prior
 * contact, requested remedy, ...) are an internal reasoning structure only —
 * never returned, persisted, or exposed outside this module. Only the final
 * rendered prose leaves `renderComplaintBody`.
 */

import { parseBooleanAnswer } from '@/lib/ai/intent-guards'
import type { Sector } from '@/lib/complaints/sectors'
import {
  extractAmounts,
  extractDates,
  extractQuantities,
  extractReferences,
  norm,
  isSuperseded,
  stripInstructions,
  supersededValues,
} from '@/lib/complaints/drafting/text'

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** The full text surface this module reasons over: every distinct thing the
 * user actually said, deduplicated so a value already present in
 * `problemDescription` (very common — it's usually copied from the most
 * recent user message) isn't scanned twice. Never includes assistant text. */
function buildCorpus(problemDescription: string, userMessages: string[]): string {
  const seen = new Set<string>()
  const parts: string[] = []
  for (const raw of [problemDescription, ...userMessages]) {
    // Instructions about what to write are not reported facts.
    const text = normalizeWhitespace(stripInstructions(raw))
    if (text === '' || seen.has(text)) continue
    seen.add(text)
    parts.push(text)
  }
  return parts.join(' ')
}

/** Either a list of substrings or a pattern over the normalised corpus. */
type IssueRule = { keywords: string[] | RegExp; clause: string }

/** Any bill mention, checked after outage/meter/dispute rules (so "دفعت
 * الفاتورة" offered as context for an outage never wins). */
const ANY_BILL = /فاتور|\bbills?\b/

/** "فاتورة الموية ارتفعت بشكل مو طبيعي", "زادت الفاتورة", "my bill went up". */
const BILL_RISE =
  /فاتور\S*(?:\s+\S+){0,4}\s+(?:ارتفع\S*|زاد\S*|زايد\S*|مرتفع\S*|عالي\S*|غالي\S*|خيالي\S*|نار)|(?:ارتفاع|ارتفعت|زياده|زادت|غلاء)\s+(?:\S+\s+){0,2}(?:قيمه\s+)?(?:ال)?فاتور|bill\s+(?:went up|increased|is (?:too |very )?high|doubled|jumped)|(?:high|higher|increased|inflated)\s+(?:\w+\s+)?bill/

/** Mid-sentence noun phrases (not full subject lines — see
 * formal-letter.ts's own SECTOR_SUBJECT_RULES for those) describing *what
 * went wrong*, checked in order against the full corpus. */
// Bill-dispute rules deliberately require a genuine dispute phrase, never
// the bare word "فاتورة"/"فواتير" alone — a bare word also matches sentences
// like "دفعت الفاتورة كاملة" (bill paid, offered as supporting context for a
// *different* complaint, e.g. an outage), which is the opposite of a billing
// dispute. Outage/defect rules are checked first regardless, for the same
// reason (a payment-confirmation mention must never redirect the issue away
// from what the user actually complained about).
const BILL_DISPUTE_KEYWORDS = [
  'اعتراض على الفاتورة',
  'فاتورة غير صحيحة',
  'زيادة في الفاتورة',
  'خطأ في الفاتورة',
  'ارتفاع الفاتورة',
  'فاتورة مبالغ فيها',
  // Emergency release fix — the exact phrases Part 3 requires that don't
  // themselves contain the word "فاتورة" ("مبلغ غير صحيح", "خصم زائد") —
  // still unambiguous, two-word dispute phrases, never a bare "مبلغ"/"خصم"
  // alone, for the same false-positive reason as above.
  'مبلغ غير صحيح',
  'خصم زائد',
  // Emergency Fix #2, Part 2 — same reasoning, one more unambiguous phrase.
  'تم احتساب مبلغ إضافي',
]

// Emergency Fix #2, Part 1 — commerce delivery-delay, checked before the
// generic "استرجاع/استرداد/الطلب/متجر/المبلغ" bucket below (which also
// contains the bare word "الطلب" and would otherwise swallow every delivery-
// delay message into a generic "order/refund" clause instead of its own
// specific one). Substring-matched against the raw, non-arabic-normalized
// corpus (see buildCorpus) — every keyword here must therefore keep the
// hamza exactly as typed ("تأخر", not "تاخر").
const DELIVERY_DELAY_KEYWORDS = ['تأخر', 'لم يصل', 'ما وصل', 'تجاوز موعد التسليم', 'مر وقت التسليم']

const SECTOR_ISSUE_CLAUSES: Record<Sector, IssueRule[]> = {
  water: [
    { keywords: ['انقطاع', 'انقطعت', 'منقطعة', 'منقطع'], clause: 'انقطاع خدمة المياه' },
    { keywords: ['توصيل', 'تركيب', 'خط مياه'], clause: 'التأخر في توصيل خدمة المياه' },
    { keywords: BILL_RISE, clause: 'ارتفاع قيمة فاتورة المياه' },
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة مياه غير صحيحة' },
    { keywords: ANY_BILL, clause: 'قيمة فاتورة المياه' },
  ],
  telecom: [
    // Emergency release fix — service interruption and weak coverage were
    // previously one merged rule producing the same clause text either way,
    // so a genuine outage ("انقطعت عني خدمة الإنترنت وأنا دفعت قيمتها") could
    // end up described as "weak coverage" in the generated letter. Split into
    // two distinct rules — must stay in lockstep with formal-letter.ts's own
    // SECTOR_SUBJECT_RULES telecom rules (same keyword sets, same order), so
    // the subject line and this mid-sentence clause never describe two
    // different problems.
    // Emergency Fix #2, Part 2 — explicit required priority: interruption,
    // then billing, then weak coverage (previously billing was checked
    // last). Matters whenever a message names both billing and weak-coverage
    // wording with no interruption at all — billing must win.
    {
      keywords: ['انقطاع', 'منقطع', 'مقطوع', 'انقطعت', 'توقف', 'توقفت', 'ما يشتغل', 'ما يعمل'],
      clause: 'انقطاع خدمة الإنترنت',
    },
    { keywords: BILL_RISE, clause: 'ارتفاع قيمة فاتورة الاتصالات' },
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة اتصالات غير صحيحة' },
    { keywords: ANY_BILL, clause: 'قيمة فاتورة الاتصالات' },
    { keywords: ['بطيء', 'بطء', 'بطيئة', 'بطيئ'], clause: 'بطء خدمة الإنترنت' },
    {
      keywords: ['ضعيف', 'ضعف', 'سيئ', 'سيئة', 'تغطية'],
      clause: 'ضعف تغطية خدمة الإنترنت',
    },
  ],
  commerce: [
    { keywords: ['معيب', 'تالف', 'عيب'], clause: 'استلام منتج معيب أو تالف' },
    // Emergency Fix #2, Part 1 — checked before the generic order/refund
    // bucket below (which also matches the bare word "الطلب" and would
    // otherwise swallow every delivery-delay message into a generic clause).
    { keywords: DELIVERY_DELAY_KEYWORDS, clause: 'تأخر تسليم الطلب عن الموعد المحدد' },
    {
      keywords: ['استرجاع', 'استرداد', 'الطلب', 'متجر', 'المبلغ'],
      clause: 'عدم الوفاء بالتزامات الطلب أو عدم استرداد المبلغ المدفوع',
    },
  ],
  municipality: [
    { keywords: ['حفرة', 'حفر', 'الطريق', 'الشارع'], clause: 'وجود حفرة أو تلف في الطريق' },
    { keywords: ['رصيف', 'الأرصفة'], clause: 'تلف في الرصيف' },
    {
      keywords: ['نظافة', 'قمامة', 'نفايات', 'زبالة', 'الزبالة'],
      clause: 'تراكم النفايات وتدهور النظافة العامة',
    },
    { keywords: ['إنارة', 'اناره', 'إضاءة'], clause: 'تعطل إنارة الشارع' },
    { keywords: ['أنقاض', 'مخلفات بناء', 'مخلفات البناء'], clause: 'وجود مخلفات بناء في موقع عام' },
  ],
  electricity: [
    { keywords: ['انقطاع', 'انقطعت', 'منقطعة'], clause: 'انقطاع التيار الكهربائي' },
    { keywords: ['عداد'], clause: 'خلل في عداد الكهرباء' },
    { keywords: BILL_RISE, clause: 'ارتفاع قيمة فاتورة الكهرباء' },
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة كهرباء غير صحيحة' },
    { keywords: ANY_BILL, clause: 'قيمة فاتورة الكهرباء' },
  ],
}

const SECTOR_GENERIC_ISSUE_CLAUSE: Record<Sector, string> = {
  water: 'المشكلة المتعلقة بخدمة المياه',
  telecom: 'المشكلة المتعلقة بخدمة الاتصالات',
  commerce: 'المشكلة المتعلقة بالتعامل التجاري المذكور',
  municipality: 'المشكلة المتعلقة بالخدمات البلدية',
  electricity: 'المشكلة المتعلقة بخدمة الكهرباء',
}

function deriveIssueClause(sector: Sector | null, corpus: string): string {
  if (!sector) return 'المشكلة المذكورة'
  const normalized = norm(corpus)
  for (const rule of SECTOR_ISSUE_CLAUSES[sector]) {
    const matched = Array.isArray(rule.keywords)
      ? rule.keywords.some((keyword) => corpus.includes(keyword))
      : rule.keywords.test(normalized)
    if (matched) return rule.clause
  }
  return SECTOR_GENERIC_ISSUE_CLAUSE[sector]
}

/** Strips a self-describing leading word ("شركة"/"متجر") the user may have
 * already included in the name itself (e.g. "متجر الأناقة"), so the fixed
 * template word this function adds next to it is never duplicated
 * ("لدى متجر متجر الأناقة"). */
function stripLeadingLabel(value: string, label: string): string {
  return value.startsWith(`${label} `) ? value.slice(label.length).trim() : value
}

function deriveProviderClause(sector: Sector | null, provider: string): string {
  if (provider === '') return ''
  if (sector === 'telecom') return ` التابعة لشركة ${stripLeadingLabel(provider, 'شركة')}`
  if (sector === 'commerce') return ` لدى متجر ${stripLeadingLabel(provider, 'متجر')}`
  return ''
}

// Requires the payment mention to actually be *about a utility bill*
// ("الفاتورة"/"الفواتير") rather than a bare "دفعت"/"سددت" stem — that bare
// stem also matches an unrelated payment mention (e.g. a commerce refund
// request: "أريد استرداد المبلغ الذي دفعته"), where "no outstanding dues" is
// not merely irrelevant but actively wrong (the payment *is* the dispute).
// Only meaningful for utility sectors that actually bill recurring dues.
const UTILITY_SECTORS: ReadonlySet<Sector> = new Set(['water', 'electricity', 'telecom'])
const NO_OUTSTANDING_DUES_PATTERN =
  /دفعت (كامل )?الفاتورة|سددت (كامل )?الفاتورة|تم سداد الفاتورة|سداد الفواتير|لا توجد مستحقات|بدون تأخير في السداد/

/** Ordered — first match wins. Every phrase here is a fixed, normalized
 * clause; the user's own relative-time wording (however they phrased it) is
 * never copied verbatim, only classified into one of these. */
const TIMELINE_RULES: { pattern: RegExp; phrase: string }[] = [
  { pattern: /منذ شهرين|قبل شهرين/, phrase: 'منذ شهرين' },
  { pattern: /منذ شهر|قبل شهر/, phrase: 'منذ شهر' },
  { pattern: /منذ أسبوعين|قبل أسبوعين/, phrase: 'منذ أسبوعين' },
  { pattern: /منذ أسبوع|قبل أسبوع/, phrase: 'منذ أسبوع' },
  { pattern: /منذ ثلاثة أيام|قبل ثلاثة أيام/, phrase: 'منذ ثلاثة أيام' },
  { pattern: /منذ يومين|قبل يومين/, phrase: 'منذ يومين' },
  { pattern: /(منذ|من) (يوم )?أمس/, phrase: 'منذ يوم أمس' },
  { pattern: /منذ اليوم|من اليوم/, phrase: 'منذ اليوم' },
]

function deriveTimelinePhrase(corpus: string): string | null {
  for (const rule of TIMELINE_RULES) {
    if (rule.pattern.test(corpus)) return rule.phrase
  }
  return null
}

const ONGOING_PATTERN = /ما زال|لا يزال|حتى الآن|إلى الآن|مستمر/
const RESOLVED_PATTERN = /تم حل|تم الإصلاح|تم إصلاح|انتهت المشكلة/

/** Defaults to true whenever a timeline was found and nothing says the issue
 * was already resolved — an ongoing, unresolved problem is the normal
 * implication of "it started X and I'm complaining now" (requirement: infer
 * from context), never claimed when there's no time reference to infer it from. */
function deriveOngoing(corpus: string, timelinePhrase: string | null): boolean {
  if (RESOLVED_PATTERN.test(corpus)) return false
  if (ONGOING_PATTERN.test(corpus)) return true
  return timelinePhrase !== null
}

const PRIOR_CONTACT_PHRASE = 'كما سبق التواصل مع الجهة المعنية بشأن هذه المشكلة دون التوصل إلى حل.'
const NO_PRIOR_CONTACT_PHRASE = 'لم يسبق لي التواصل مع مزود الخدمة بشأن هذه المشكلة.'

/**
 * Phase 7.7, Part 2/3 — `prior_provider_contact` decides this sentence
 * *exclusively* through the shared canonical boolean classifier
 * (parseBooleanAnswer). Never falls back to scanning the raw answer or the
 * wider corpus for a contact-attempt keyword: that reconstruction-from-free-
 * text path (removed here) is exactly what Part 3 forbids ("the complaint
 * generator must never reconstruct boolean meaning from free text") — it
 * could disagree with the canonical value already decided elsewhere (e.g.
 * the summary card), producing a letter that contradicts what the user was
 * shown. `true`/`false` each render their own fixed, exact sentence; an
 * unresolvable value (only possible for pre-Phase-7.6 legacy free-text rows)
 * omits the sentence entirely rather than guessing.
 */
function derivePreviousContactSentence(priorContactRaw: string): string | null {
  const raw = normalizeWhitespace(priorContactRaw)
  // "نعم، بلاغان دون حل" is still a yes: when the whole answer is not a bare
  // yes/no, its leading word is classified (by the same parser) instead of
  // dropping the sentence (evaluation case CST-040).
  const wholeAnswer = parseBooleanAnswer(raw)
  const firstWord = raw.split(/[\s،,.:؛-]+/)[0] ?? ''
  const parsed = wholeAnswer ?? parseBooleanAnswer(firstWord)
  // The yes/no decision stays with parseBooleanAnswer; any further detail the
  // user gave ("نعم، بلاغان دون حل") is appended verbatim, never dropped.
  // (Arabic has no \b word boundary in JS, so the leading word is sliced off.)
  const rest =
    wholeAnswer === null && parsed !== null
      ? raw
          .slice(firstWord.length)
          .replace(/^[\s،,.:؛-]+/, '')
          .trim()
      : ''
  const detail = rest ? ` (${rest})` : ''
  if (parsed === true) return PRIOR_CONTACT_PHRASE.replace(/\.$/, `${detail}.`)
  if (parsed === false) return NO_PRIOR_CONTACT_PHRASE.replace(/\.$/, `${detail}.`)
  return null
}

/*
 * When no prior-contact field was collected (only telecom asks for one), the
 * user's own account of contacting the provider is still a fact the letter
 * should carry ("كلمتهم أكثر من مرة وما استفدت"). Only a positive, explicit
 * statement counts; the attempt count is never more specific than the user's
 * words. The collected field, when present, always wins (see the caller).
 */
const CONTACT_STATEMENT =
  /(?:كلمتهم|كلمت|تواصلت|اتصلت|راجعتهم|راجعت|بلغتهم|بلغت|اشتكيت|رفعت (?:بلاغ|شكوي)|قدمت (?:بلاغ|شكوي)|i (?:have )?(?:contacted|called|reported|complained|emailed|spoke)|i've (?:contacted|called|reported|complained))/
const MULTIPLE_CONTACT =
  /(?:اكثر من مره|كذا مره|عده مرات|مرات|مرارا|several|multiple|many times|a bunch of times|more than once|again and again|repeatedly)/

function deriveContactFromCorpus(corpus: string): string | null {
  const text = norm(corpus)
  if (!CONTACT_STATEMENT.test(text)) return null
  return MULTIPLE_CONTACT.test(text)
    ? 'وقد سبق لي التواصل مع الجهة المعنية أكثر من مرة لمحاولة معالجة المشكلة، إلا أنها لم تُحل حتى الآن.'
    : 'وقد سبق لي التواصل مع الجهة المعنية بشأن هذه المشكلة، إلا أنها لم تُحل حتى الآن.'
}

/** Amounts, explicit dates and reference numbers the user gave, stated once
 * in formal wording — never the user's informal sentence itself. */
function deriveFactsSentence(corpus: string): string {
  // Values the user explicitly corrected ("لا قصدي 950 مو 900") are dropped.
  const superseded = supersededValues(corpus)
  const amounts = extractAmounts(corpus)
    .filter((a) => !superseded.has(a.value))
    .map((a) => (a.currency ? `${a.value} ريال` : a.value))
  const dates = extractDates(corpus).filter((d) => !isSuperseded(d, superseded))
  const references = extractReferences(corpus).filter(
    (r) => !amounts.some((a) => a.startsWith(r)) && !superseded.has(r),
  )
  const quantities = extractQuantities(corpus).filter((q) => !isSuperseded(q, superseded))
  const parts: string[] = []
  if (amounts.length > 0) {
    parts.push(
      `${amounts.length > 1 ? 'المبالغ المذكورة' : 'المبلغ المذكور'}: ${amounts.join(' و')}`,
    )
  }
  if (dates.length > 0)
    parts.push(`${dates.length > 1 ? 'التواريخ' : 'التاريخ'}: ${dates.join(' و')}`)
  if (references.length > 0) {
    parts.push(
      `${references.length > 1 ? 'الأرقام المرجعية' : 'الرقم المرجعي'}: ${references.join(' و')}`,
    )
  }
  if (quantities.length > 0) parts.push(`المدد والقيم المذكورة: ${quantities.join('، ')}`)
  return parts.length > 0 ? `وفيما يلي البيانات ذات الصلة: ${parts.join('؛ ')}.` : ''
}

type ResolutionRule = { pattern: RegExp; phrase: string }

const RESOLUTION_RULES: ResolutionRule[] = [
  { pattern: /استرداد|استرجاع|إرجاع المبلغ|استعادة المبلغ/, phrase: 'استرداد المبلغ المدفوع' },
  // A bill or meter-reading dispute asks for the bill to be reviewed — never
  // for "power to be restored" (evaluation: the old sector default asked a
  // meter/bill complaint to restore an electricity supply that never failed).
  {
    pattern: /فاتور|قراء[ةه]|عداد|مبلغ|خصم|bill/,
    phrase: 'مراجعة الفاتورة والتحقق من صحة المبلغ المحتسب، واتخاذ الإجراء المناسب في حال وجود خطأ',
  },
  { pattern: /تعويض/, phrase: 'تعويضي عن الأضرار الناتجة' },
  { pattern: /استبدال/, phrase: 'استبدال المنتج أو الخدمة' },
  { pattern: /إصلاح|صيانة/, phrase: 'إصلاح العطل في أقرب وقت ممكن' },
  { pattern: /إعادة الخدمة|استعادة الخدمة/, phrase: 'إعادة تشغيل الخدمة في أقرب وقت ممكن' },
]

/** Restoring a supply is only requested when the user reported losing it. */
const OUTAGE_PATTERN = /انقطاع|انقطع|انقطعت|مقطوع|طاف|تطفي|ينقطع|ضعيف|ضعف|لا يعمل|ما يشتغل|توقف/

const SECTOR_DEFAULT_RESOLUTION: Record<Sector, string> = {
  water: 'إصلاح العطل وإعادة تشغيل الخدمة في أقرب وقت ممكن',
  electricity: 'إصلاح العطل وإعادة التيار الكهربائي في أقرب وقت ممكن',
  // Never compensation unless the user asked for it (RESOLUTION_RULES).
  telecom: 'استعادة الخدمة ومعالجة سبب الانقطاع في أقرب وقت ممكن',
  commerce: 'استرداد المبلغ المدفوع أو استبدال المنتج أو الخدمة',
  municipality: 'معالجة المشكلة واتخاذ الإجراء اللازم',
}

function deriveExpectedResolution(sector: Sector | null, corpus: string): string {
  for (const rule of RESOLUTION_RULES) {
    if (rule.pattern.test(corpus)) return rule.phrase
  }
  if (
    sector &&
    (sector === 'commerce' || sector === 'municipality' || OUTAGE_PATTERN.test(corpus))
  ) {
    return SECTOR_DEFAULT_RESOLUTION[sector]
  }
  return 'معالجة المشكلة واتخاذ الإجراء اللازم في أقرب وقت ممكن'
}

/*
 * An impact clause is only stated when the user's own words support it — the
 * evaluation found the previous fixed per-sector clauses asserting things the
 * user never said ("تعذر الاستفادة من التيار" for a bill dispute, "ضرر مادي
 * دون وجه حق" for a late delivery). No supported impact → no clause.
 */
const IMPACT_RULES: { sectors: Sector[]; pattern: RegExp; phrase: string }[] = [
  {
    sectors: ['electricity'],
    pattern: OUTAGE_PATTERN,
    phrase: 'تعذر الاستفادة من التيار الكهربائي بشكل طبيعي',
  },
  {
    sectors: ['water'],
    pattern: OUTAGE_PATTERN,
    phrase: 'تعذر الاستفادة من خدمة المياه بشكل طبيعي',
  },
  { sectors: ['telecom'], pattern: OUTAGE_PATTERN, phrase: 'تعذر الاستفادة من الخدمة بشكل طبيعي' },
  {
    sectors: ['municipality'],
    pattern: /خطر|سلامه|سلامة|أضرار|ضرر|حادث|إصاب|انجرح/,
    phrase: 'تأثر السلامة العامة في المنطقة',
  },
]

function deriveImpactClause(sector: Sector | null, corpus: string): string | null {
  if (!sector) return null
  const rule = IMPACT_RULES.find((r) => r.sectors.includes(sector) && r.pattern.test(corpus))
  return rule ? rule.phrase : null
}

export type NarrativeInput = {
  sector: Sector | null
  problemDescription: string
  userMessages: string[]
  provider: string
  city: string
  priorContactRaw: string
}

export type ComplaintBody = {
  introduction: string
  explanation: string
  resolution: string
}

/**
 * Reads every user message plus the already-collected fields (never only the
 * last message or `problem_description` alone — requirement 1), classifies
 * what's actually known against a fixed set of deterministic rules, and
 * composes three formal, non-verbatim paragraphs from the result.
 */
export function renderComplaintBody(input: NarrativeInput): ComplaintBody {
  const corpus = buildCorpus(input.problemDescription, input.userMessages)
  const provider = normalizeWhitespace(input.provider)
  const city = normalizeWhitespace(input.city)

  const issueClause = deriveIssueClause(input.sector, corpus)
  const providerClause = deriveProviderClause(input.sector, provider)
  const noOutstandingDues =
    input.sector !== null &&
    UTILITY_SECTORS.has(input.sector) &&
    NO_OUTSTANDING_DUES_PATTERN.test(corpus)
  const timelinePhrase = deriveTimelinePhrase(corpus)
  const ongoing = deriveOngoing(corpus, timelinePhrase)
  const previousContactSentence =
    normalizeWhitespace(input.priorContactRaw) !== ''
      ? derivePreviousContactSentence(input.priorContactRaw)
      : deriveContactFromCorpus(corpus)
  const expectedResolution = deriveExpectedResolution(input.sector, corpus)
  const impactClause = deriveImpactClause(input.sector, corpus)

  let introduction = `أتقدم بهذه الشكوى بشأن ${issueClause}${providerClause}`
  if (noOutstandingDues) {
    introduction += '، وذلك رغم سداد جميع الفواتير المستحقة وعدم وجود أي مستحقات مالية'
  }
  introduction += '.'

  // Every exact fact the user supplied (amounts, dates, reference numbers)
  // reaches the authority unchanged, in formal wording — the user's informal
  // sentence itself is never pasted into the letter.
  const details = deriveFactsSentence(corpus)

  // Only what is known is stated: no "حدثت هذه المشكلة" placeholder when no
  // time reference exists, and no impact the user did not describe.
  const explanationParts: string[] = []
  if (timelinePhrase) {
    explanationParts.push(
      `بدأت المشكلة ${timelinePhrase}${ongoing ? ' وما زالت مستمرة حتى وقت تقديم الشكوى' : ''}`,
    )
  } else if (ongoing) {
    explanationParts.push('ما زالت المشكلة مستمرة حتى وقت تقديم الشكوى')
  }
  let explanation =
    explanationParts.length > 0
      ? `${explanationParts[0]}${impactClause ? `، الأمر الذي تسبب في ${impactClause}` : ''}.`
      : impactClause
        ? `وقد تسببت هذه المشكلة في ${impactClause}.`
        : ''
  if (previousContactSentence) {
    explanation = explanation
      ? `${explanation} ${previousContactSentence}`
      : previousContactSentence
  }
  explanation = [explanation, details].filter(Boolean).join('\n\n')

  let resolution = `آمل من الجهة المختصة ${expectedResolution}`
  if (city !== '') {
    resolution += `، علماً بأن الموقع في مدينة ${city}`
  }
  resolution += '.'

  return { introduction, explanation, resolution }
}
