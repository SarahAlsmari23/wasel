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

/*
 * An unresolved earlier complaint IS the problem being reported — the
 * escalation case («شركة النت ما حلت مشكلتي», «لم يتم حل بلاغي», "the store
 * never resolved my issue"). Asking the user to describe the problem again
 * after this was the PR #10 bug. Narrow on purpose: the verb must be about
 * resolving/answering and refer to a problem, report or complaint (or carry
 * the object suffix «حلوها»), so "I haven't fixed my car" or «ما حليت
 * الواجب» stay unaffected. Only consulted once a sector is known.
 */
const ARABIC_UNRESOLVED_PATTERN = new RegExp(
  [
    // «ما حلت مشكلتي», «محد حل البلاغ», «لم يتم حل المشكله», «ما عالجوا بلاغي»
    '(?<![\\u0600-\\u06FF])[وف]?(?:ما|لم|محد|ماحد|ما\\s*احد|لا\\s*احد)\\s*(?:(?:يتم|تم)\\s*)?(?:حل|حلت|حلو|حلوا|يحل|يحلون|تحل|يحلو|عالج\\S*|يعالج\\S*|تعالج|معالجه|صلح\\S*|يصلح\\S*|اصلاح|تجاوب\\S*|يتجاوب\\S*)\\s+(?:لي\\s+)?(?:ال)?(?:مشكل|بلاغ|شكو|موضوع|خلل|عطل)',
    // «ما انحلت», «للحين ما حلوها», «ما صلحوها»
    '(?<![\\u0600-\\u06FF])[وف]?(?:ما|لم)\\s*(?:انحل\\S*|تنحل|ينحل|حلوها|حلوه|صلحوها|صلحوه|عالجوها|عالجوه)',
    // «لم تقم الشركه بحل مشكلتي», «لم يقوموا بمعالجه البلاغ»
    '(?<![\\u0600-\\u06FF])[وف]?(?:لم|ما)\\s*(?:يقم|تقم|يقوموا|يقومو|قام|قامت|قاموا)\\S*\\s+(?:\\S+\\s+){0,3}(?:بحل|بمعالجه|باصلاح|بالرد)',
    '(?:عدم|بدون|دون|من\\s*غير)\\s*(?:حل|معالجه|اصلاح|الاستجابه|التجاوب|الرد\\s*علي)',
    // «المشكله مازالت قايمه»
    '(?:مازال|ما\\s*زال|لازال|لا\\s*زال|لا\\s*تزال|لا\\s*يزال)\\S*\\s+(?:\\S+\\s+)?قايم',
    // «اشتكيت وما سووا شي», «ومحد تجاوب», «ماحد يرد علي»
    '(?<![\\u0600-\\u06FF])[وف]?ما\\s*سوو\\S*\\s*(?:شي|اي\\s*شي)',
    '(?<![\\u0600-\\u06FF])[وف]?(?:محد|ماحد|ما\\s*احد|لا\\s*احد)\\s*(?:تجاوب|يتجاوب|رد|يرد|عبرني|يعبرني)',
    // ignored / stalled («طنشوني», «يتجاهلون بلاغي», «مماطله»)
    'طنش|مطنش|تجاهل|يتجاهل|متجاهل|ماطل|يماطل|مماطل',
  ].join('|'),
)
const ENGLISH_UNRESOLVED_PATTERN =
  /\b(?:(?:has|have|had|did|does|do|is|are|was|were)n'?t|not|never|nobody|no one|no-one)\s+(?:yet\s+|even\s+|been\s+|really\s+)*(?:fix|fixed|resolv\w*|solv\w*|address\w*|handl\w*|repair\w*|respond\w* to|answer\w*)\s+(?:it|them|(?:my|the|our|this|that)\s+(?:\w+\s+)?(?:problem|issue|complaint|report|case|ticket|request|outage|fault)s?)\b|\b(?:unresolved|unsolved|still (?:not|isn'?t|hasn'?t|haven'?t) (?:been )?(?:fixed|resolved|solved)|ignor\w*|stalling|no (?:reply|response|answer) (?:to|on|for) my)\b/i

/** The user reports that a provider or authority left their problem or earlier complaint unresolved. */
export function describesUnresolvedComplaint(message: string): boolean {
  return (
    ARABIC_UNRESOLVED_PATTERN.test(normalizeArabicInput(message)) ||
    ENGLISH_UNRESOLVED_PATTERN.test(message)
  )
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
  // It must actually ask to complain ("هههههه" leaves nothing either).
  const asksToComplain =
    new RegExp(COMPLAINT_REQUEST.source).test(normalizeArabicInput(message)) ||
    /\b(?:complain\w*|complaint|file|report)\b/i.test(message)
  return words.length === 0 && asksToComplain
}
