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
  /مقطوع|انقطع|انقطاع|طافي|طفت|تطفي|ما يشتغل|مايشتغل|ما تشتغل|لا يعمل|ما يعمل|خربان|خراب|خرب|عطل|تعطل|معطل|تسرب|ضعيف|ضعف|بطيء|بطييه|بطيي|رفض|امتنع|ما رجع|ما رد|لم يرد|محد رد|محد عطاني|احتيال|غش|نصب|نصاب|مقلد|وهميه|فاتوره (عاليه|غلط|خاطئه|خياليه)|خياليه|اعلي (من المعتاد|بكثير)|ارتفعت|مرتفع|مبلغ (زايد|زائد)|خصم|خصمت|بالف ريال|مشكله|مشاكل|متضرر|تضرر|طفح|طافح|المجاري راجعه|تراكم|متكوم|متهالك|مخالف|ضاله|لم تستكمل|لم يصل|ولم يصلني|ما وصل|يختلف|ازعاج|غلط|ما يجيب|خلصت قبل|تحولني|عيب|ما يبون|غرقت|متجمعه|قطع عني|قطعوا/
const ENGLISH_PROBLEM_PATTERN =
  /\b(cut off|cutting out|not working|doesn'?t work|stopped working|outage|down|broken|faulty|leak(ing)?|refus\w*|no (running )?(water|power|electricity|internet|signal)|overcharg\w*|charged me twice|deducted|wrong( bill)?|unusually high|tripled|scam|fraud|fake|damaged|weak|slow|dead|went dark|never arrived|failed to deliver|blocked me|overflowing|not been collected|out for|problem|issues?|complain\w*)\b/i

/*
 * An information question ("ما الجهة المختصة بشكاوى انقطاع المياه؟", "How
 * long does NWC take to resolve a billing complaint?") names a problem type
 * without reporting one. Measured on evals/: treating those as problems
 * opened complaint-detail collection for a plain question. A message that
 * opens with an interrogative and carries no first-person marker is a
 * question, not a report — unless it explicitly asks to file a complaint.
 */
const ARABIC_QUESTION_START = /^(ما|ماهي|ماهو|من|كيف|هل|كم|متى|لمن|اين|وش|ايش|عطني)\s/
const ENGLISH_QUESTION_START = /^(which|what|how|who|where|when|is|are|does|do|should|can|could)\b/i
const ARABIC_FIRST_PERSON =
  /عندي|عندنا|عني|علينا|بيتي|بيتنا|منزلي|طلبي|فاتورتي|حسابي|اشتريت|طلبت|دفعت|جتني|قدمت/
const ENGLISH_FIRST_PERSON = /\b(my|our|we'?ve|I'?ve|I have|I had|me|we have)\b/i

export function isInformationQuestion(message: string): boolean {
  const arabic = normalizeArabicInput(message)
  // "my complaint" / "my report" refer to the complaint itself, not to a
  // problem being reported (evals CST-039: "What is the deadline for CST to
  // respond to my complaint?").
  const english = message.trim().replace(/\bmy (complaint|report|case|request)\b/gi, 'the $1')
  const asks = ARABIC_QUESTION_START.test(arabic) || ENGLISH_QUESTION_START.test(english)
  if (!asks) return false
  return !ARABIC_FIRST_PERSON.test(arabic) && !ENGLISH_FIRST_PERSON.test(english)
}

export function describesProblem(message: string): boolean {
  if (wantsToCreateComplaint(message)) return true
  if (isInformationQuestion(message)) return false
  if (hasGrievanceSignal(message)) return true
  if (ARABIC_PROBLEM_PATTERN.test(normalizeArabicInput(message))) return true
  return ENGLISH_PROBLEM_PATTERN.test(message)
}

const COMPLAINT_REQUEST =
  /(?:وين|فين|كيف|وش|ايش|ماذا|هل)?\s*(?:اقدر|ممكن|تقدر|تقدري|ودي|ابي|ابغي|ابغا|اريد|احتاج|ابيك|ممكن)?\s*(?:ا|ن|ت)?(?:شتكي|اشتكي|قدم|اقدم|ارفع|رفع|اكتب|تكتب|كتابه|تقديم)\s*(?:لي)?\s*(?:شكوي|شكوه|بلاغ|على|عليهم|عليه|ضد)?|(?:شكوي|بلاغ|مساعده|ساعدني|تساعدني|سوال|استفسار)|(?:وش|ايش|ماذا)\s+(?:اسوي|افعل)/g
const REQUEST_FILLER =
  /(?<![؀-ۿ])(?:علي|على|عن|في|من|مع|ضد|الي|لي|يا|لو|سمحت|شركه|الشركه|جهه|الجهه|مشكله|عندي|لدي|ابي|ابغي|و|ف|المويه|مويه|المياه|مياه|الكهربا|الكهرباء|كهرباء|النت|الانترنت|الاتصالات|المتجر|متجر|محل|المحل|البلديه|بلديه|الامانه|هييه|وزاره|التجاره|الوطنيه|السعوديه|للطاقه|للمياه|اين|وين|كيف|هل|اقدر|ممكن|تقدر)(?![؀-ۿ])/g
const ENGLISH_REQUEST =
  /\b(?:where|how|can|could|do|does|should|i|you|me|we|to|a|an|the|my|about|with|against|for|please|help|want|wanna|need|would|like|complain|complaint|file|submit|make|lodge|report|write|company|provider|water|electricity|power|internet|telecom|store|shop|municipality|ministry|authority|bill|issue|problem)\b/gi

/**
 * True when the text asks *to* complain without saying what is wrong
 * ("وين أشتكي على الموية؟", "أبي أقدم بلاغ على الكهرباء", "where do I
 * complain about water?"). Complaint readiness requires the problem itself.
 */
export function isOnlyComplaintRequest(message: string): boolean {
  const arabic = normalizeArabicInput(message)
    .replace(/[؟?!.,،]/g, ' ')
    .replace(COMPLAINT_REQUEST, ' ')
    .replace(REQUEST_FILLER, ' ')
  const rest = arabic
    .replace(ENGLISH_REQUEST, ' ')
    .replace(/[^؀-ۿA-Za-z0-9]+/g, ' ')
    .trim()
  const words = rest.split(' ').filter((w) => w.length > 1)
  return words.length === 0 && /[؀-ۿA-Za-z]/.test(message)
}
