import {
  GREETING_RESPONSE,
  IDENTITY_RESPONSE,
  NO_VERIFIED_INFO_RESPONSE,
  OUT_OF_SCOPE_RESPONSE,
} from '@/lib/ai/intent-guards'
import { SUBTYPE_CLARIFICATION_QUESTIONS } from '@/lib/complaints/issue-signal'
import type { Sector } from '@/lib/complaints/sectors'
import { defineCopy, type Locale } from '@/lib/i18n/config'

/**
 * Every server-authored (never model-generated) chat message, in both
 * languages. Arabic wording is unchanged from the original constants; the
 * English versions carry the same meaning and the same guarantees (e.g. the
 * assistant never claims to submit anything on the user's behalf).
 */
export const SERVER_COPY = defineCopy({
  ar: {
    greeting: GREETING_RESPONSE,
    identity: IDENTITY_RESPONSE,
    outOfScope: OUT_OF_SCOPE_RESPONSE,
    noVerifiedInfo: NO_VERIFIED_INFO_RESPONSE,
    completion: 'اكتملت المعلومات اللازمة، وسأقوم الآن بإعداد البلاغ الرسمي.',
    validationRetry: 'تعذر حفظ إجابتك الأخيرة. حاول إرسالها مرة أخرى من فضلك.',
    officialSiteLabel: 'الموقع الرسمي',
    errors: {
      invalidRequest: 'الطلب غير صالح.',
      rateLimited: 'لقد تجاوزت الحد المسموح به من الطلبات. حاول مرة أخرى بعد قليل.',
      unavailable: 'تعذر التواصل مع المساعد الذكي حالياً. حاول مرة أخرى لاحقاً.',
      unexpected: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    },
  },
  en: {
    greeting: 'Welcome to Wasel! How can I help you today?',
    identity:
      "I'm Wasel, your AI assistant for government enquiries, complaints and reports.\n\nI help you understand government services, identify the responsible authority, answer your questions, and prepare formal complaints when needed.",
    outOfScope:
      "Sorry, I can't help with that. I specialise in Saudi government services and enquiries, and in directing complaints to the right authority.",
    noVerifiedInfo:
      "I don't currently have reliable, up-to-date information on that. Please check the authority's official website.",
    completion: "I have all the information I need, and I'll now prepare the formal complaint.",
    validationRetry: "Your last answer couldn't be saved. Please send it again.",
    officialSiteLabel: 'Official website',
    errors: {
      invalidRequest: 'Invalid request.',
      rateLimited: "You've sent too many requests. Please try again shortly.",
      unavailable: "The AI assistant can't be reached right now. Please try again later.",
      unexpected: 'Something went wrong. Please try again.',
    },
  },
})

const ENGLISH_SUBTYPE_QUESTIONS: Partial<Record<Sector, string>> = {
  telecom:
    'What exactly is the problem? Is it a service outage, weak coverage, a billing issue, or something else?',
  commerce:
    'What exactly was the problem with the store? Was it about a product, an order, a return, an exchange, a service, misleading advertising, or a late delivery?',
}

export function subtypeClarificationQuestion(sector: Sector, locale: Locale): string | undefined {
  return locale === 'en'
    ? ENGLISH_SUBTYPE_QUESTIONS[sector]
    : SUBTYPE_CLARIFICATION_QUESTIONS[sector]
}

/**
 * English wording for each known complaint field's question. Arabic keeps
 * using the authority-maintained `label_ar` from complaint_types.required_fields
 * (the deterministic, database-backed source); English needs its own phrasing
 * because no English labels exist in the database.
 */
const ENGLISH_FIELD_QUESTIONS: Record<string, string> = {
  problem_description: 'Could you describe the problem in detail?',
  city: 'Which city is this in?',
  merchant_name: 'What is the name of the store or business?',
  service_provider: 'Who is your service provider?',
  prior_provider_contact: 'Have you already contacted the service provider about this?',
  location_or_address: 'What is the exact location or address?',
  account_or_meter_number: 'What is your account or meter number?',
  bill_reference: 'What is the bill number?',
  previous_report_number: 'Do you have a previous report number?',
  purchase_proof: 'Do you have proof of purchase (such as an invoice or receipt)?',
}

export const ENGLISH_FIELD_LABELS: Record<string, string> = {
  problem_description: 'Problem description',
  city: 'City',
  merchant_name: 'Store or business name',
  service_provider: 'Service provider',
  prior_provider_contact: 'Prior contact with the provider',
  location_or_address: 'Location or address',
  account_or_meter_number: 'Account or meter number',
  bill_reference: 'Bill number',
  previous_report_number: 'Previous report number',
  purchase_proof: 'Proof of purchase',
}

/** The deterministic next-field question in the requested language. */
export function localizedFieldQuestion(
  fieldKey: string,
  arabicQuestion: string,
  locale: Locale,
): string {
  if (locale === 'ar') return arabicQuestion
  return ENGLISH_FIELD_QUESTIONS[fieldKey] ?? arabicQuestion
}
