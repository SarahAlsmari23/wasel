import { COMPLAINT_FIELD_LABELS } from '@/lib/complaints/formal-letter'
import { parseBooleanAnswer } from '@/lib/ai/intent-guards'

/**
 * Deterministic, no AI call — the same summary the pre-generation
 * RecommendationCard both displays and copies ("نسخ الملخص"). Reuses the
 * exact known-field vocabulary/labels the formal letter builder already uses
 * (lib/complaints/formal-letter.ts) so both stay in sync and never drift.
 */
export type ComplaintSummaryStructured = {
  entityName: string
  complaintTypeLabel?: string
  problemDescription?: string
  city?: string
  providerOrMerchant?: string
  priorContact?: string
  locationOrAddress?: string
  accountOrMeterNumber?: string
  billReference?: string
  previousReportNumber?: string
  purchaseProof?: string
}

export type ComplaintSummaryResult = {
  structured: ComplaintSummaryStructured
  summaryText: string
}

export type BuildComplaintSummaryInput = {
  entityName: string
  /** Real complaint_types.name_ar, when available (see lib/ai/routing.ts) —
   * never invented, simply omitted from the summary when absent. */
  complaintTypeLabel?: string | null
  collectedFields: Record<string, string>
}

function clean(value: string | undefined): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

/** Appends a period only when the text doesn't already end with sentence
 * punctuation — never doubles up ("..", "..."). */
function withClosingPeriod(value: string): string {
  return /[.!؟?…]$/.test(value) ? value : `${value}.`
}

/** Phase 7.6, Part 1/2 — the single canonical normalizer (parseBooleanAnswer)
 * decides between the two fixed, exact sentences; the raw answer itself is
 * NEVER concatenated into the displayed text (that was the exact bug: "تم
 * التواصل سابقًا: ماتواصلت"). A value that can't be confidently normalized
 * (should not occur for anything stored after Phase 7.6 — see wasal-chat.tsx,
 * which now only ever persists the canonical "true"/"false" — but may still
 * appear in an older, legacy-saved free-text row) is treated as `null`, never
 * guessed; the caller omits the line entirely rather than ever risk
 * displaying a raw or contradictory value. */
function formatPriorContact(rawValue: string): string | null {
  const parsed = parseBooleanAnswer(rawValue)
  if (parsed === true) return 'تم التواصل سابقًا.'
  if (parsed === false) return 'لم يتم التواصل سابقًا.'
  return null
}

type SummaryLine = { label: string; value: string }

/**
 * Builds the deterministic pre-generation summary shown on RecommendationCard
 * and copied via "نسخ الملخص". Every value is either passed straight through
 * from `collectedFields`/`entityName`/`complaintTypeLabel` (already verified
 * upstream) or omitted — nothing here is ever invented, truncated mid-word,
 * or replaced with a paraphrase.
 */
export function buildComplaintSummary(input: BuildComplaintSummaryInput): ComplaintSummaryResult {
  const entityName = clean(input.entityName)
  const complaintTypeLabel = clean(input.complaintTypeLabel ?? undefined)
  const providerOrMerchant = clean(
    input.collectedFields.service_provider || input.collectedFields.merchant_name,
  )
  const providerOrMerchantLabel = input.collectedFields.service_provider
    ? COMPLAINT_FIELD_LABELS.service_provider
    : COMPLAINT_FIELD_LABELS.merchant_name

  const fields: { key: keyof ComplaintSummaryStructured; label: string; value: string }[] = [
    {
      key: 'problemDescription',
      label: COMPLAINT_FIELD_LABELS.problem_description,
      value: clean(input.collectedFields.problem_description),
    },
    { key: 'city', label: COMPLAINT_FIELD_LABELS.city, value: clean(input.collectedFields.city) },
    { key: 'providerOrMerchant', label: providerOrMerchantLabel, value: providerOrMerchant },
    {
      key: 'priorContact',
      label: COMPLAINT_FIELD_LABELS.prior_provider_contact,
      value: clean(input.collectedFields.prior_provider_contact),
    },
    {
      key: 'locationOrAddress',
      label: COMPLAINT_FIELD_LABELS.location_or_address,
      value: clean(input.collectedFields.location_or_address),
    },
    {
      key: 'accountOrMeterNumber',
      label: COMPLAINT_FIELD_LABELS.account_or_meter_number,
      value: clean(input.collectedFields.account_or_meter_number),
    },
    {
      key: 'billReference',
      label: COMPLAINT_FIELD_LABELS.bill_reference,
      value: clean(input.collectedFields.bill_reference),
    },
    {
      key: 'previousReportNumber',
      label: COMPLAINT_FIELD_LABELS.previous_report_number,
      value: clean(input.collectedFields.previous_report_number),
    },
    {
      key: 'purchaseProof',
      label: COMPLAINT_FIELD_LABELS.purchase_proof,
      value: clean(input.collectedFields.purchase_proof),
    },
  ]

  // Applies light, natural-language formatting to the raw collected value —
  // `problem_description` always reads as a full sentence, and a prior-
  // contact answer is phrased as one of the two fixed canonical sentences
  // (Phase 7.6, Part 2) rather than ever showing the raw stored value. Used
  // for both `structured` and `lines` below, so neither ever exposes a raw
  // boolean phrase. Returns `null` only for `priorContact` when the stored
  // value can't be confidently normalized — that field is then omitted
  // entirely (never shown raw or guessed), everything else always returns a
  // string.
  function displayValue(field: (typeof fields)[number]): string | null {
    if (field.key === 'problemDescription') return withClosingPeriod(field.value)
    if (field.key === 'priorContact') return formatPriorContact(field.value)
    return field.value
  }

  const structured: ComplaintSummaryStructured = { entityName }
  if (complaintTypeLabel !== '') structured.complaintTypeLabel = complaintTypeLabel
  for (const field of fields) {
    if (field.value === '') continue
    const value = displayValue(field)
    if (value !== null) {
      ;(structured as Record<string, string>)[field.key] = value
    }
  }

  const lines: SummaryLine[] = [{ label: 'الجهة المختصة', value: entityName }]
  if (complaintTypeLabel !== '') lines.push({ label: 'تصنيف الشكوى', value: complaintTypeLabel })
  for (const field of fields) {
    if (field.value === '') continue
    const value = displayValue(field)
    if (value !== null) lines.push({ label: field.label, value })
  }

  const summaryText = lines.map((line) => `${line.label}: ${line.value}`).join('\n')

  return { structured, summaryText }
}
