import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'
import { hasGrievanceSignal } from '@/lib/ai/intent-guards'
import { wantsToCreateComplaint } from '@/lib/wasal/complaint-intent'

/*
 * Does this message describe an actual problem (as opposed to merely
 * mentioning a sector)? Used to decide whether a follow-up message is new
 * information that justifies moving the conversation to another authority.
 * Matched against normalised Arabic (ة→ه, أ/إ/آ→ا, ى→ي) and raw English.
 */
const ARABIC_PROBLEM_PATTERN =
  /مقطوع|انقطع|انقطاع|طافي|طفت|ما يشتغل|مايشتغل|لا يعمل|ما يعمل|خربان|خراب|عطل|تعطل|تسرب|ضعيف|ضعف|بطيء|رفض|ما رجع|ما رد|لم يرد|احتيال|غش|فاتوره (عاليه|غلط|خاطئه)|مبلغ (زايد|زائد)|مشكله|متضرر|تضرر/
const ENGLISH_PROBLEM_PATTERN =
  /\b(cut off|not working|doesn'?t work|stopped working|outage|down|broken|faulty|leak(ing)?|refused|no (water|power|electricity|internet|signal)|overcharg\w*|wrong bill|scam|fraud|damaged|weak|slow|problem|issue|complain\w*)\b/i

export function describesProblem(message: string): boolean {
  if (hasGrievanceSignal(message) || wantsToCreateComplaint(message)) return true
  if (ARABIC_PROBLEM_PATTERN.test(normalizeArabicInput(message))) return true
  return ENGLISH_PROBLEM_PATTERN.test(message)
}
