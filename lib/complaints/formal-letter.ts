/**
 * Deterministic, server-side formal complaint letter builder — no AI call, no
 * database call. Every value in the output is either passed straight through
 * from `collectedFields`/`fullName`/`entityName` (already verified upstream:
 * `fullName` from `profiles.full_name`, `entityName` from routing) or a fixed
 * template string. Nothing here is ever invented — a missing fact is simply
 * omitted, never guessed or filled in with a plausible-looking placeholder.
 */

import { isMeaningfulTitle } from '@/lib/complaints/display'
import { ENTITY_NAME_TO_SECTOR, type Sector } from '@/lib/complaints/sectors'
import { renderComplaintBody } from '@/lib/complaints/narrative'

const MAX_SUBJECT_LENGTH = 60

// Excludes technical/sensitive keys defensively, even though the only way a
// key reaches this module is already the small, server-controlled
// required_fields vocabulary below — a second, independent line of defense
// in case that vocabulary is ever extended carelessly.
const SENSITIVE_KEY_PATTERN = /national[_-]?id|phone|password|card|bank|account[_-]?number/i

/**
 * The only keys ever rendered in the letter's details section — anything not
 * listed here is silently dropped, never shown under its raw internal key.
 * `problem_description` and `city` are handled separately by the template
 * (first detail line, and the dedicated "المدينة" line) and are not repeated
 * here.
 */
const ADDITIONAL_FIELD_LABELS: Record<string, string> = {
  merchant_name: 'اسم المتجر أو الجهة التجارية',
  service_provider: 'مزود الخدمة',
  prior_provider_contact: 'التواصل السابق مع مزود الخدمة',
  location_or_address: 'الموقع أو العنوان',
  account_or_meter_number: 'رقم الحساب أو العداد',
  bill_reference: 'رقم الفاتورة',
  previous_report_number: 'رقم البلاغ السابق',
  purchase_proof: 'إثبات الشراء',
}

/** Every `collectedFields` key this builder ever reads — `problem_description`
 * and `city` (template-special) plus every key in `ADDITIONAL_FIELD_LABELS`.
 * Exported so callers (the complaint-creation action's input sanitizer) can
 * allow-list against the same single source of truth instead of duplicating
 * this list and risking drift. */
export const KNOWN_COMPLAINT_FIELD_KEYS: readonly string[] = [
  'problem_description',
  'city',
  ...Object.keys(ADDITIONAL_FIELD_LABELS),
]

/** Arabic labels for every key in KNOWN_COMPLAINT_FIELD_KEYS, including the
 * two template-special ones (`problem_description`/`city`) alongside
 * ADDITIONAL_FIELD_LABELS — the single shared source collected_information
 * persistence (lib/db/collected-information.ts) and this letter builder both
 * read field labels from. */
export const COMPLAINT_FIELD_LABELS: Record<string, string> = {
  problem_description: 'وصف المشكلة',
  city: 'المدينة',
  ...ADDITIONAL_FIELD_LABELS,
}

export type BuildFormalLetterInput = {
  entityName: string
  fullName: string
  collectedFields: Record<string, string>
  conversationTitle?: string
  /** Every user message in the conversation, chronological — read by the
   * narrative rewriter (lib/complaints/narrative.ts) alongside
   * `collectedFields.problem_description` so facts mentioned across several
   * messages are still picked up, not just the single field value. Optional
   * and defaults to empty for callers that don't have it, in which case the
   * rewriter reasons from `problem_description` alone. */
  userMessages?: string[]
}

export type FormalLetterResult = {
  subject: string
  complaintText: string
  generatedFromData: Record<string, unknown>
}

function cleanText(value: string | undefined): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Truncates to at most MAX_SUBJECT_LENGTH without ever cutting a word in
 * half. An ellipsis is added only in the extreme edge case where not even
 * one whole word fits the budget — otherwise the cut lands cleanly on a word
 * boundary with no trailing punctuation added.
 */
function truncateSubjectAtWordBoundary(value: string): string {
  if (value.length <= MAX_SUBJECT_LENGTH) return value

  const slice = value.slice(0, MAX_SUBJECT_LENGTH)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > 0) {
    return slice.slice(0, lastSpace).trimEnd()
  }
  return `${slice.trimEnd()}…`
}

type SubjectRule = { keywords: string[]; subject: string }

/** Ordered by priority within each sector — the first rule whose keywords
 * appear anywhere in the (already user-provided) problem description wins.
 * Every subject here is a fixed, formal, generic phrase — never a provider
 * or merchant name, even when one was supplied in collectedFields. */
const SECTOR_SUBJECT_RULES: Record<Sector, SubjectRule[]> = {
  water: [
    { keywords: ['فاتورة', 'فواتير'], subject: 'اعتراض على فاتورة مياه' },
    { keywords: ['انقطاع', 'انقطعت', 'منقطعة', 'منقطع'], subject: 'شكوى بشأن انقطاع خدمة المياه' },
    { keywords: ['توصيل', 'تركيب', 'خط مياه'], subject: 'شكوى بشأن خدمة توصيل المياه' },
  ],
  telecom: [
    // Emergency release fix — interruption and weak coverage are now two
    // distinct rules (previously merged, always labeling a genuine outage as
    // "ضعف خدمة الإنترنت"), same as narrative.ts's SECTOR_ISSUE_CLAUSES
    // telecom rules (kept in lockstep).
    // Emergency Fix #2, Part 2 — explicit required priority: interruption,
    // then billing, then weak coverage (previously billing was checked
    // last) — matters when a message names billing and weak-coverage
    // wording with no interruption at all.
    {
      keywords: ['انقطاع', 'منقطع', 'مقطوع', 'انقطعت', 'توقف', 'توقفت', 'ما يشتغل', 'ما يعمل'],
      subject: 'شكوى بشأن انقطاع خدمة الإنترنت',
    },
    {
      keywords: [
        'فاتورة',
        'فواتير',
        'مبلغ غير صحيح',
        'خصم زائد',
        // Emergency Fix #2, Part 2
        'تم احتساب مبلغ إضافي',
      ],
      subject: 'اعتراض على فاتورة اتصالات',
    },
    {
      keywords: ['ضعيف', 'ضعف', 'بطيء', 'بطء', 'سيئ', 'سيئة'],
      subject: 'شكوى بشأن ضعف تغطية الإنترنت',
    },
  ],
  commerce: [
    { keywords: ['معيب', 'تالف', 'عيب'], subject: 'بلاغ عن منتج معيب' },
    // Emergency Fix #2, Part 1 — checked before the generic order/refund
    // bucket below (same keywords as narrative.ts's DELIVERY_DELAY_KEYWORDS,
    // kept in lockstep so the subject line and body clause agree).
    {
      keywords: ['تأخر', 'لم يصل', 'ما وصل', 'تجاوز موعد التسليم', 'مر وقت التسليم'],
      subject: 'شكوى بشأن تأخر تسليم الطلب',
    },
    {
      keywords: ['استرجاع', 'استرداد', 'الطلب', 'متجر', 'المبلغ'],
      subject: 'شكوى ضد متجر إلكتروني',
    },
  ],
  municipality: [
    { keywords: ['حفرة', 'حفر', 'الطريق', 'الشارع'], subject: 'بلاغ عن حفرة أو تلف في الطريق' },
    { keywords: ['رصيف', 'الأرصفة'], subject: 'بلاغ عن تلف في الرصيف' },
    { keywords: ['نظافة', 'قمامة', 'نفايات'], subject: 'بلاغ عن مشكلة في النظافة العامة' },
  ],
  electricity: [
    { keywords: ['انقطاع', 'انقطعت', 'منقطعة'], subject: 'بلاغ عن انقطاع الكهرباء' },
    { keywords: ['فاتورة', 'فواتير'], subject: 'اعتراض على فاتورة كهرباء' },
    { keywords: ['عداد'], subject: 'شكوى بشأن عداد الكهرباء' },
  ],
}

/** telecom-only: when no text keyword matched but the user did name a
 * provider, "شكوى ضد مزود خدمة اتصالات" is still more informative than the
 * fully generic fallback — without ever naming the provider itself. */
function telecomProviderDisputeSubject(
  sector: Sector,
  collectedFields: Record<string, string>,
): string | null {
  if (sector !== 'telecom') return null
  const provider = cleanText(collectedFields.service_provider)
  return provider !== '' ? 'شكوى ضد مزود خدمة اتصالات' : null
}

function matchSectorSubject(
  entityName: string,
  problemDescription: string,
  collectedFields: Record<string, string>,
): string | null {
  const sector = ENTITY_NAME_TO_SECTOR[entityName]
  if (!sector) return null

  for (const rule of SECTOR_SUBJECT_RULES[sector]) {
    if (rule.keywords.some((keyword) => problemDescription.includes(keyword))) {
      return rule.subject
    }
  }

  return telecomProviderDisputeSubject(sector, collectedFields)
}

/** A short, non-invented issue phrase for the fully generic fallback — the
 * first few words of what the user actually wrote, never a paraphrase or
 * summary the user didn't say themselves. */
function shortIssuePhrase(problemDescription: string): string {
  if (problemDescription === '') return 'غير محدد'
  const words = problemDescription.split(' ').filter(Boolean)
  return words.slice(0, 6).join(' ')
}

function deriveSubject(
  conversationTitle: string | undefined,
  entityName: string,
  problemDescription: string,
  collectedFields: Record<string, string>,
): string {
  const cleanedTitle = cleanText(conversationTitle)
  if (isMeaningfulTitle(cleanedTitle)) {
    return truncateSubjectAtWordBoundary(cleanedTitle)
  }

  const ruleSubject = matchSectorSubject(entityName, problemDescription, collectedFields)
  if (ruleSubject) return ruleSubject

  return truncateSubjectAtWordBoundary(`شكوى بشأن ${shortIssuePhrase(problemDescription)}`)
}

/**
 * Derives a short, deterministic conversation title from the problem
 * description collected so far — the exact same sector/keyword classification
 * `deriveSubject` already uses for the formal letter's subject line, reused
 * here rather than duplicated (Phase 6.7, Part 1). `entityName` may be an
 * empty string when routing hasn't resolved yet; `deriveSubject` degrades
 * gracefully to its fully generic "شكوى بشأن ..." fallback in that case. Never
 * passes an existing conversation title through — callers decide separately
 * (via `isMeaningfulTitle`) whether the result is safe to persist.
 */
export function deriveComplaintTitleFromFields(
  entityName: string,
  problemDescription: string,
  collectedFields: Record<string, string>,
): string {
  return deriveSubject(
    undefined,
    cleanText(entityName),
    cleanText(problemDescription),
    collectedFields,
  )
}

type CollectedFieldEntry = { key: string; label: string; value: string }

/** Fields the narrative rewriter already folds into prose (provider name,
 * prior-contact sentence) — never repeated a second time as a raw reference
 * line underneath (requirement: never repeat information). */
const NARRATED_FIELD_KEYS = new Set(['service_provider', 'merchant_name', 'prior_provider_contact'])

/** Only known, non-empty, non-sensitive, non-narrated fields, excluding
 * `problem_description` and `city` (handled separately) and excluding
 * anything whose value is already substantively present in the problem
 * description — the remaining objective reference data (bill/account/report
 * numbers, addresses) that must stay exact, never paraphrased. */
function collectAdditionalFields(
  collectedFields: Record<string, string>,
  problemDescription: string,
): CollectedFieldEntry[] {
  const entries: CollectedFieldEntry[] = []

  for (const [key, label] of Object.entries(ADDITIONAL_FIELD_LABELS)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue
    if (NARRATED_FIELD_KEYS.has(key)) continue
    const rawValue = collectedFields[key]
    if (typeof rawValue !== 'string') continue

    const value = cleanText(rawValue)
    if (value === '') continue
    if (problemDescription !== '' && problemDescription.includes(value)) continue

    entries.push({ key, label, value })
  }

  return entries
}

/**
 * Builds the first formal complaint letter deterministically from already-
 * verified inputs. Pure function — no network call, no side effects, safe to
 * call repeatedly with the same inputs and get the same result.
 */
export function buildFormalComplaintLetter(input: BuildFormalLetterInput): FormalLetterResult {
  const entityName = cleanText(input.entityName)
  const fullName = cleanText(input.fullName)
  const problemDescription = cleanText(input.collectedFields.problem_description)
  const city = cleanText(input.collectedFields.city)
  const provider =
    cleanText(input.collectedFields.service_provider) ||
    cleanText(input.collectedFields.merchant_name)
  const priorContactRaw = cleanText(input.collectedFields.prior_provider_contact)
  const userMessages = (input.userMessages ?? []).map((message) => cleanText(message))

  const subject = deriveSubject(
    input.conversationTitle,
    entityName,
    problemDescription,
    input.collectedFields,
  )
  const additionalFields = collectAdditionalFields(input.collectedFields, problemDescription)

  // Rewrites what the user actually said (across every message, not just
  // `problem_description`) into professional prose instead of copying their
  // wording — see lib/complaints/narrative.ts.
  const { introduction, explanation, resolution } = renderComplaintBody({
    sector: ENTITY_NAME_TO_SECTOR[entityName] ?? null,
    problemDescription,
    userMessages,
    provider,
    city,
    priorContactRaw,
  })

  const referenceLines = additionalFields.map((entry) => `${entry.label}: ${entry.value}`)

  const sections = [
    `إلى: ${entityName}`,
    `الموضوع: ${subject}`,
    'السلام عليكم ورحمة الله وبركاته،',
    introduction,
    explanation,
    resolution,
    referenceLines.length > 0 ? `للاستدلال:\n${referenceLines.join('\n')}` : '',
    'وتفضلوا بقبول فائق الاحترام والتقدير،',
    `الاسم: ${fullName}`,
  ].filter((section) => section !== '')

  const generatedFromData: Record<string, unknown> = {
    entityName,
    fullName,
    subject,
    problemDescription,
    city: city !== '' ? city : undefined,
    additionalFields: Object.fromEntries(additionalFields.map((entry) => [entry.key, entry.value])),
  }

  return {
    subject,
    complaintText: sections.join('\n\n'),
    generatedFromData,
  }
}
