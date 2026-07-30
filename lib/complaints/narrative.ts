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
    const text = normalizeWhitespace(raw)
    if (text === '' || seen.has(text)) continue
    seen.add(text)
    parts.push(text)
  }
  return parts.join(' ')
}

type IssueRule = { keywords: string[]; clause: string }

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
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة مياه غير صحيحة' },
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
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة اتصالات غير صحيحة' },
    {
      keywords: ['ضعيف', 'ضعف', 'بطيء', 'بطء', 'سيئ', 'سيئة'],
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
    { keywords: ['نظافة', 'قمامة', 'نفايات'], clause: 'تراكم النفايات وتدهور النظافة العامة' },
  ],
  electricity: [
    { keywords: ['انقطاع', 'انقطعت', 'منقطعة'], clause: 'انقطاع التيار الكهربائي' },
    { keywords: ['عداد'], clause: 'خلل في عداد الكهرباء' },
    { keywords: BILL_DISPUTE_KEYWORDS, clause: 'احتساب فاتورة كهرباء غير صحيحة' },
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
  for (const rule of SECTOR_ISSUE_CLAUSES[sector]) {
    if (rule.keywords.some((keyword) => corpus.includes(keyword))) return rule.clause
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
  const parsed = parseBooleanAnswer(normalizeWhitespace(priorContactRaw))
  if (parsed === true) return PRIOR_CONTACT_PHRASE
  if (parsed === false) return NO_PRIOR_CONTACT_PHRASE
  return null
}

type ResolutionRule = { pattern: RegExp; phrase: string }

const RESOLUTION_RULES: ResolutionRule[] = [
  { pattern: /استرداد|استرجاع|إرجاع المبلغ|استعادة المبلغ/, phrase: 'استرداد المبلغ المدفوع' },
  { pattern: /تعويض/, phrase: 'تعويضي عن الأضرار الناتجة' },
  { pattern: /استبدال/, phrase: 'استبدال المنتج أو الخدمة' },
  { pattern: /إصلاح|صيانة/, phrase: 'إصلاح العطل في أقرب وقت ممكن' },
  { pattern: /إعادة الخدمة|استعادة الخدمة/, phrase: 'إعادة تشغيل الخدمة في أقرب وقت ممكن' },
]

const SECTOR_DEFAULT_RESOLUTION: Record<Sector, string> = {
  water: 'إصلاح العطل وإعادة تشغيل الخدمة في أقرب وقت ممكن',
  electricity: 'إصلاح العطل وإعادة التيار الكهربائي في أقرب وقت ممكن',
  telecom: 'استعادة الخدمة وتعويضي عن فترة الانقطاع إن أمكن ذلك',
  commerce: 'استرداد المبلغ المدفوع أو استبدال المنتج أو الخدمة',
  municipality: 'معالجة المشكلة واتخاذ الإجراء اللازم من الجهة المختصة',
}

function deriveExpectedResolution(sector: Sector | null, corpus: string): string {
  for (const rule of RESOLUTION_RULES) {
    if (rule.pattern.test(corpus)) return rule.phrase
  }
  return sector ? SECTOR_DEFAULT_RESOLUTION[sector] : 'اتخاذ الإجراء المناسب لمعالجة هذه الشكوى'
}

const SECTOR_DEFAULT_IMPACT: Record<Sector, string> = {
  water: 'تعذر الاستفادة من خدمة المياه بشكل طبيعي',
  electricity: 'تعذر الاستفادة من التيار الكهربائي بشكل طبيعي',
  telecom: 'تعذر الاستفادة من الخدمة',
  commerce: 'وقوع ضرر مادي دون وجه حق',
  municipality: 'تأثر السلامة العامة وجودة الخدمة في المنطقة',
}

function deriveImpactClause(sector: Sector | null): string {
  return sector ? SECTOR_DEFAULT_IMPACT[sector] : 'تأثري بشكل مباشر من استمرار هذه المشكلة'
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
  const previousContactSentence = derivePreviousContactSentence(input.priorContactRaw)
  const expectedResolution = deriveExpectedResolution(input.sector, corpus)
  const impactClause = deriveImpactClause(input.sector)

  let introduction = `أتقدم بهذه الشكوى بشأن ${issueClause}${providerClause}`
  if (noOutstandingDues) {
    introduction += '، وذلك رغم سداد جميع الفواتير المستحقة وعدم وجود أي مستحقات مالية'
  }
  introduction += '.'

  let explanation: string
  if (timelinePhrase) {
    explanation = `بدأت المشكلة ${timelinePhrase}`
    explanation += ongoing ? ' وما زالت مستمرة حتى وقت تقديم الشكوى' : ''
  } else if (ongoing) {
    explanation = 'ما زالت المشكلة مستمرة حتى وقت تقديم الشكوى'
  } else {
    explanation = 'حدثت هذه المشكلة'
  }
  explanation += `، الأمر الذي تسبب في ${impactClause}.`
  if (previousContactSentence) {
    explanation += ` ${previousContactSentence}`
  }

  let resolution = `آمل من الجهة المختصة ${expectedResolution}`
  if (city !== '') {
    resolution += `، علماً بأن الموقع في مدينة ${city}`
  }
  resolution += '، وذلك وفق الأنظمة والإجراءات المعمول بها.'

  return { introduction, explanation, resolution }
}
