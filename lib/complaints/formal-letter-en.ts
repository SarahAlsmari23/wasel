import { ENGLISH_FIELD_LABELS } from '@/lib/ai/server-copy'
import type { BuildFormalLetterInput, FormalLetterResult } from '@/lib/complaints/formal-letter'
import { ENTITY_NAME_TO_SECTOR, type Sector } from '@/lib/complaints/sectors'
import { entityDisplayName } from '@/lib/mock/government-entities'
import {
  arabicRatio,
  extractAmounts,
  extractDates,
  extractReferences,
  informalEnglish,
  norm,
} from '@/lib/complaints/drafting/text'

/*
 * English formal complaint letter — the counterpart of the Arabic builder in
 * formal-letter.ts, used when the interface language is English. Same
 * guarantees: deterministic, no model call, never invents a fact. The issue
 * is classified into a fixed English phrase; the user's description is only
 * reused when it is already clean English (no Arabic, no questions, no
 * slang) — otherwise its exact facts (amounts, dates, references) are
 * listed instead of pasting colloquial text into a formal letter.
 */

const SECTOR_SUBJECTS: Record<Sector, string> = {
  water: 'Complaint regarding water services',
  telecom: 'Complaint regarding telecommunications services',
  commerce: 'Complaint against a commercial business',
  municipality: 'Report regarding municipal services',
  electricity: 'Complaint regarding electricity services',
}

const SENSITIVE_KEY_PATTERN = /national[_-]?id|password|token|secret|card|bank|account[_-]?number/i
const REFERENCE_FIELD_KEYS = [
  'location_or_address',
  'bill_reference',
  'previous_report_number',
  'purchase_proof',
  'account_or_meter_number',
] as const

function clean(value: string | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

/** Normalises the free-text yes/no answer for prior contact. */
function describePriorContact(raw: string): string | null {
  const value = clean(raw)
  if (value === '') return null
  // Anything said after the yes/no ("Yes, called customer care on 4 March")
  // is kept verbatim — evaluation case CST-041 lost that date.
  const detailAfter = (pattern: RegExp) => {
    const rest = value
      .replace(pattern, '')
      .replace(/^[\s,.:;-]+/, '')
      .trim()
    return rest ? ` Details: ${rest.replace(/[.]$/, '')}.` : ''
  }
  const yes = /^(yes|y|نعم|ايه|إيه|أيوه|ايوه|اي)\b/i
  if (yes.test(value)) {
    return `I have already contacted the service provider about this matter, but it has not been resolved.${detailAfter(yes)}`
  }
  const no = /^(no|n|لا)\b/i
  if (no.test(value)) {
    return `I have not yet contacted the service provider directly about this matter.${detailAfter(no)}`
  }
  return `Previous contact with the service provider: ${value}`
}

/** Ordered per sector; tested against the normalised user text (Arabic or English). */
const ISSUE_RULES: Record<Sector, { pattern: RegExp; issue: string; request: string }[]> = {
  water: [
    {
      pattern: /انقطاع|انقطع|مقطوع|ما فيه موي|cut off|no water|outage|interrupt/,
      issue: 'an interruption of the water supply',
      request: 'restore the water supply as soon as possible',
    },
    {
      pattern: /فاتور|bill/,
      issue: 'the amount of my water bill',
      request: 'review the bill, verify the amount charged and correct it if an error is found',
    },
    { pattern: /تسرب|تسريب|leak/, issue: 'a water leak', request: 'inspect and repair the leak' },
    {
      pattern: /صرف|مجاري|sewage|sewer/,
      issue: 'a sewage problem',
      request: 'inspect and resolve the sewage problem',
    },
  ],
  electricity: [
    {
      pattern: /انقطاع|انقطع|مقطوع|طاف|تطفي|power cut|outage|blackout|no power/,
      issue: 'an interruption of the electricity supply',
      request: 'restore the electricity supply and prevent recurrence',
    },
    {
      pattern: /عداد|meter/,
      issue: 'a problem with my electricity meter',
      request: 'inspect the meter and correct any resulting charges',
    },
    {
      pattern: /فاتور|bill/,
      issue: 'the amount of my electricity bill',
      request: 'review the bill, verify the amount charged and correct it if an error is found',
    },
  ],
  telecom: [
    {
      pattern:
        /انقطاع|انقطع|مقطوع|فاصل|طافي|توقف|ما يشتغل|down|outage|not working|no service|disconnected/,
      issue: 'an interruption of my telecommunications service',
      request: 'restore the service and address the cause of the interruption',
    },
    {
      pattern: /فاتور|خصم|رصيد|مبلغ|bill|charged|deducted|balance/,
      issue: 'charges applied to my telecommunications account',
      request: 'review the charges and refund any amount found to be incorrect',
    },
    {
      pattern: /بطي|بطء|slow/,
      issue: 'persistently slow internet service',
      request: 'investigate and improve the service quality',
    },
    {
      pattern: /ضعيف|ضعف|تغطيه|coverage|signal|weak/,
      issue: 'weak network coverage',
      request: 'investigate and improve the coverage',
    },
  ],
  commerce: [
    {
      pattern: /معيب|تالف|عيب|خربان|مقلد|defective|damaged|broken|fake|counterfeit/,
      issue: 'a defective product I purchased',
      request: 'require the merchant to replace the product or refund the amount paid',
    },
    {
      pattern: /تاخر|ما وصل|لم يصل|ما جاني|late|delay|never arrived|not delivered|hasn't arrived/,
      issue: 'an order that has not been delivered as agreed',
      request: 'require the merchant to deliver the order or refund the amount paid',
    },
    {
      pattern: /استرجاع|استرداد|ارجاع|refund|return/,
      issue: "a merchant's refusal to refund or accept a return",
      request: 'require the merchant to process the refund',
    },
  ],
  municipality: [
    {
      pattern: /حفر|حفره|الطريق|الشارع|pothole|road|street/,
      issue: 'a road defect in a public street',
      request: 'inspect the site and carry out the necessary repairs',
    },
    {
      pattern: /رصيف|ارصفه|sidewalk|pavement/,
      issue: 'a damaged sidewalk',
      request: 'inspect the site and carry out the necessary repairs',
    },
    {
      pattern: /نظافه|قمامه|زباله|نفايات|garbage|trash|rubbish|waste/,
      issue: 'uncollected waste in a public area',
      request: 'arrange for the area to be cleaned',
    },
    {
      pattern: /اناره|انارة|light/,
      issue: 'faulty street lighting',
      request: 'inspect and repair the street lighting',
    },
  ],
}
const GENERIC_ISSUE: Record<Sector, string> = {
  water: 'a problem with my water service',
  electricity: 'a problem with my electricity service',
  telecom: 'a problem with my telecommunications service',
  commerce: 'a problem with a commercial transaction',
  municipality: 'a municipal service issue',
}

const CONTACT_STATEMENT =
  /(?:كلمتهم|كلمت|تواصلت|اتصلت|راجعت|بلغت|اشتكيت|رفعت (?:بلاغ|شكوي)|i (?:have )?(?:contacted|called|reported|complained|emailed|spoke)|i've (?:contacted|called|reported|complained))/
const MULTIPLE_CONTACT =
  /(?:اكثر من مره|كذا مره|عده مرات|مرات|several|multiple|many times|a bunch of times|more than once|repeatedly)/

/** The description is reused only when it already reads as formal English. */
function isCleanEnglish(text: string): boolean {
  return (
    text.length >= 15 &&
    text.length <= 600 &&
    arabicRatio(text) < 0.05 &&
    !/[?؟]/.test(text) &&
    informalEnglish(text).length === 0 &&
    !/\b(?:help me|where (?:do|can|should) i|can you|write (?:me )?a complaint)\b/i.test(text)
  )
}

function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  const capped = t.charAt(0).toUpperCase() + t.slice(1)
  return /[.!]$/.test(capped) ? capped : `${capped}.`
}

export function buildEnglishFormalComplaintLetter(
  input: BuildFormalLetterInput,
): FormalLetterResult {
  const entityNameArabic = clean(input.entityName)
  const entityName = entityDisplayName(entityNameArabic, 'en')
  const fullName = clean(input.fullName)
  const fields = input.collectedFields
  const problemDescription = clean(fields.problem_description)
  const city = clean(fields.city)
  const provider = clean(fields.service_provider) || clean(fields.merchant_name)
  const sector = ENTITY_NAME_TO_SECTOR[entityNameArabic]
  const corpusRaw = [problemDescription, ...(input.userMessages ?? [])].join('\n')
  const corpus = norm(corpusRaw)

  const subject = sector ? SECTOR_SUBJECTS[sector] : 'Formal complaint'
  const rule = sector ? ISSUE_RULES[sector].find((r) => r.pattern.test(corpus)) : undefined
  const issue = rule?.issue ?? (sector ? GENERIC_ISSUE[sector] : 'the matter described below')

  const referenceLines = REFERENCE_FIELD_KEYS.filter((key) => !SENSITIVE_KEY_PATTERN.test(key))
    .map((key) => ({ key, value: clean(fields[key]) }))
    .filter(({ value }) => value !== '' && !problemDescription.includes(value))
    .map(({ key, value }) => `${ENGLISH_FIELD_LABELS[key] ?? key}: ${value}`)

  const introduction = `I am writing to submit a formal complaint regarding ${issue}${
    city ? `, at a location in ${city}` : ''
  }.`

  const description = isCleanEnglish(problemDescription) ? sentence(problemDescription) : ''
  // Exact facts not already stated in the reused description.
  const amounts = extractAmounts(corpusRaw)
    .filter((a) => !description.includes(a.value))
    .map((a) => (a.currency ? `${a.value} SAR` : a.value))
  const dates = extractDates(corpusRaw).filter((d) => !description.includes(d))
  const references = extractReferences(corpusRaw).filter(
    (r) => !description.includes(r) && !amounts.some((a) => a.startsWith(r)),
  )
  const factParts = [
    amounts.length ? `${amounts.length > 1 ? 'amounts' : 'amount'}: ${amounts.join(' and ')}` : '',
    dates.length ? `${dates.length > 1 ? 'dates' : 'date'}: ${dates.join(' and ')}` : '',
    references.length
      ? `${references.length > 1 ? 'references' : 'reference'}: ${references.join(' and ')}`
      : '',
  ].filter(Boolean)

  const contactSentence = fields.prior_provider_contact?.trim()
    ? describePriorContact(fields.prior_provider_contact)
    : CONTACT_STATEMENT.test(corpus)
      ? MULTIPLE_CONTACT.test(corpus)
        ? 'I have contacted the provider on several occasions to resolve this matter, but it remains unresolved.'
        : 'I have already contacted the provider about this matter, but it remains unresolved.'
      : null

  const details = [
    description,
    factParts.length ? `The relevant details are as follows: ${factParts.join('; ')}.` : '',
    provider ? `The complaint concerns ${provider}.` : '',
    contactSentence ?? '',
  ].filter(Boolean)

  const request = rule
    ? `I kindly request that you ${rule.request}, and inform me of the outcome.`
    : 'I kindly request that this matter be reviewed and resolved, and that I be informed of the outcome.'

  const sections = [
    `To: ${entityName}`,
    `Subject: ${subject}`,
    'Dear Sir or Madam,',
    introduction,
    details.join(' '),
    request,
    referenceLines.length > 0 ? `For reference:\n${referenceLines.join('\n')}` : '',
    'Yours faithfully,',
    `Name: ${fullName}`,
  ].filter((section) => section !== '')

  return {
    subject,
    complaintText: sections.join('\n\n'),
    generatedFromData: {
      language: 'en',
      entityName: entityNameArabic,
      fullName,
      subject,
      problemDescription,
      city: city || undefined,
    },
  }
}
