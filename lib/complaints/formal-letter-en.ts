import { ENGLISH_FIELD_LABELS } from '@/lib/ai/server-copy'
import type { BuildFormalLetterInput, FormalLetterResult } from '@/lib/complaints/formal-letter'
import { ENTITY_NAME_TO_SECTOR, type Sector } from '@/lib/complaints/sectors'
import { entityDisplayName } from '@/lib/mock/government-entities'

/*
 * English formal complaint letter — the counterpart of the Arabic builder in
 * formal-letter.ts, used when the interface language is English. Same
 * guarantees: deterministic, no model call, never invents a fact. The user's
 * own description is quoted as written (in whatever language they used) and
 * only known, non-sensitive reference fields are listed.
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
  if (/^(yes|y|نعم|ايه|إيه|أيوه|ايوه|اي)\b/i.test(value)) {
    return 'I have already contacted the service provider about this matter, but it has not been resolved.'
  }
  if (/^(no|n|لا)\b/i.test(value)) {
    return 'I have not yet contacted the service provider directly about this matter.'
  }
  return `Previous contact with the service provider: ${value}`
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

  const subject = sector ? SECTOR_SUBJECTS[sector] : 'Formal complaint'

  const referenceLines = REFERENCE_FIELD_KEYS.filter((key) => !SENSITIVE_KEY_PATTERN.test(key))
    .map((key) => ({ key, value: clean(fields[key]) }))
    .filter(({ value }) => value !== '' && !problemDescription.includes(value))
    .map(({ key, value }) => `${ENGLISH_FIELD_LABELS[key] ?? key}: ${value}`)

  const introduction = city
    ? `I am writing to submit a formal complaint regarding the matter described below, which occurred in ${city}.`
    : 'I am writing to submit a formal complaint regarding the matter described below.'

  const details = [
    problemDescription ? `Description of the issue: ${problemDescription}` : '',
    provider ? `The complaint concerns: ${provider}.` : '',
    describePriorContact(fields.prior_provider_contact ?? '') ?? '',
  ].filter(Boolean)

  const sections = [
    `To: ${entityName}`,
    `Subject: ${subject}`,
    'Dear Sir or Madam,',
    introduction,
    details.join('\n'),
    'I kindly request that this matter be reviewed and resolved, and that I be informed of the outcome.',
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
