/**
 * Deterministic, Arabic-focused detection of an explicit field correction —
 * no AI call, same input always yields the same output (or `null`). Only
 * ever fires for the fixed, known complaint-field vocabulary, and only when
 * the message contains a genuine correction marker ("وليست", "مو ... هو",
 * "الصحيح") — never for an ordinary message that merely happens to mention
 * a field's trigger word (Phase 6.10B, Part 3, rule 3: never infer from
 * vague unrelated messages).
 */

const MAX_VALUE_LENGTH = 200
const STOP_CHARS = /[،,.؟!\n]/

type FieldTrigger = { key: string; keywords: string[] }

/** One or more trigger keywords per field — the same known-field vocabulary
 * as lib/complaints/formal-letter.ts's KNOWN_COMPLAINT_FIELD_KEYS. Order
 * doesn't matter here; every trigger present in the message is checked. */
const FIELD_TRIGGERS: FieldTrigger[] = [
  { key: 'city', keywords: ['المدينة'] },
  { key: 'service_provider', keywords: ['مزود الخدمة', 'المزود'] },
  { key: 'merchant_name', keywords: ['اسم المتجر', 'المتجر'] },
  { key: 'prior_provider_contact', keywords: ['التواصل السابق'] },
  { key: 'location_or_address', keywords: ['العنوان', 'الموقع'] },
  { key: 'account_or_meter_number', keywords: ['رقم الحساب', 'رقم العداد'] },
  { key: 'bill_reference', keywords: ['رقم الفاتورة'] },
  { key: 'previous_report_number', keywords: ['رقم البلاغ'] },
  { key: 'purchase_proof', keywords: ['إثبات الشراء'] },
  // Deliberately narrower trigger than the other fields (never the bare
  // word "المشكلة", which appears in almost every message) — an explicit
  // reference to "the description" itself, not the problem generally.
  { key: 'problem_description', keywords: ['الوصف الصحيح', 'وصف المشكلة'] },
]

// At least one of these must be present for a message to be considered a
// correction candidate at all — the fast, cheap bail-out for "vague,
// unrelated messages" (rule 3).
const CORRECTION_MARKER_PATTERN = /وليست|وليس|الصحيح|تصحيح|بدلاً من|بدل |(?:^|\s)مو(?:\s|$)/

function cleanValue(raw: string): string {
  return raw
    .trim()
    .replace(/^[:：\s]+/, '')
    .replace(/[،,.؟!]+$/, '')
    .trim()
}

/** Text after `marker` (first occurrence, searched starting at `fromIndex`),
 * up to the next stop character or end of string. */
function textAfter(text: string, marker: string, fromIndex: number): string | null {
  const markerIndex = text.indexOf(marker, fromIndex)
  if (markerIndex === -1) return null
  const after = text.slice(markerIndex + marker.length)
  const stopMatch = STOP_CHARS.exec(after)
  const slice = stopMatch ? after.slice(0, stopMatch.index) : after
  return slice
}

/** Text between `fromIndex` and the next occurrence of `marker` — used for
 * the "<trigger> VALUE وليست OLD" shape, where the value comes *before* the
 * marker rather than after it. */
function textBefore(text: string, marker: string, fromIndex: number): string | null {
  const markerIndex = text.indexOf(marker, fromIndex)
  if (markerIndex === -1) return null
  return text.slice(fromIndex, markerIndex)
}

/**
 * Tries, in order, the three correction shapes this module supports:
 *   A. "<trigger> ... الصحيح[ة] [هو|هي] VALUE"   (e.g. "رقم البلاغ الصحيح 12345")
 *   B. "<trigger> مو OLD، هو VALUE"                (e.g. "المزود مو زين، هو STC")
 *   C. "<trigger> VALUE وليس[ت] OLD"               (e.g. "المدينة جدة وليست الرياض")
 * Returns the first non-empty, length-valid extracted value, or null.
 */
function extractCorrectedValue(text: string, triggerEndIndex: number): string | null {
  const tail = text.slice(triggerEndIndex)

  if (tail.includes('الصحيح')) {
    const afterCorrect =
      textAfter(text, 'الصحيحة', triggerEndIndex) ?? textAfter(text, 'الصحيح', triggerEndIndex)
    if (afterCorrect) {
      const withoutLeadingVerb = afterCorrect.replace(/^\s*(?:هو|هي)\s*/, '')
      const value = cleanValue(withoutLeadingVerb)
      if (value !== '') return value
    }
  }

  if (/(?:^|\s)مو(?:\s|$)/.test(tail)) {
    const afterHowa =
      textAfter(text, 'هو', triggerEndIndex) ?? textAfter(text, 'هي', triggerEndIndex)
    if (afterHowa) {
      const value = cleanValue(afterHowa)
      if (value !== '') return value
    }
  }

  if (tail.includes('وليست') || tail.includes('وليس')) {
    const beforeNot =
      textBefore(text, 'وليست', triggerEndIndex) ?? textBefore(text, 'وليس', triggerEndIndex)
    if (beforeNot) {
      const value = cleanValue(beforeNot)
      if (value !== '') return value
    }
  }

  return null
}

export type FieldCorrection = { key: string; value: string }

/**
 * Only ever considers a field the user already answered (rule 1: "the field
 * is already known") — a correction to a field that isn't known yet is
 * simply a normal answer, handled by the existing missing-field flow, not
 * this module. Returns the first matching field/value pair found; a message
 * naming more than one field in one turn is out of scope for this narrow,
 * first-pass implementation (rule 5: "keep the first clear correction
 * implementation deterministic").
 */
export function detectFieldCorrection(
  content: string,
  collectedFields: Record<string, string>,
): FieldCorrection | null {
  const text = content.trim()
  if (text === '' || !CORRECTION_MARKER_PATTERN.test(text)) return null

  for (const trigger of FIELD_TRIGGERS) {
    const knownValue = collectedFields[trigger.key]
    if (typeof knownValue !== 'string' || knownValue.trim() === '') continue

    for (const keyword of trigger.keywords) {
      const keywordIndex = text.indexOf(keyword)
      if (keywordIndex === -1) continue

      const value = extractCorrectedValue(text, keywordIndex + keyword.length)
      if (value && value.length <= MAX_VALUE_LENGTH && value !== knownValue) {
        return { key: trigger.key, value }
      }
    }
  }

  return null
}
