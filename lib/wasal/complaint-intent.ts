/**
 * Detects, in the browser, that the user is explicitly asking Wasal to produce
 * the complaint ("أنشئ البلاغ", "اكتب الشكوى", "أبغى أقدم بلاغ", …).
 *
 * This is a UX affordance only: it decides *when* to offer the create-complaint
 * call to action inside the conversation. It does not alter the assistant's
 * prompts, the retrieval pipeline, or the complaint generation logic — those
 * still run exactly as before once the user opts in.
 */

// Verbs that express "make/write/submit/prepare" …
const ACTION_PATTERN =
  /(أنشئ|انشئ|أنشئي|اعمل|اعملي|اكتب|اكتبي|جهز|جهّز|جهزي|حرر|حرّر|صغ|صياغة|سوي|سوّي|ابدأ|إبدأ|ابدا|قدم|قدّم|أقدم|اقدم|أريد|اريد|ابغى|أبغى|ودي|بدي|نبي|محتاج|محتاجة)/

// … applied to a complaint noun.
const OBJECT_PATTERN = /(البلاغ|بلاغ|بلاغاً|بلاغا|الشكوى|شكوى|شكوي|الشكوي|المعروض)/

/**
 * Phrases that are unambiguous on their own, so they match even when the verb
 * and the noun are split across a longer sentence.
 */
const DIRECT_PATTERNS = [
  /أنشئ\s*(لي\s*)?(ال)?بلاغ/,
  /انشئ\s*(لي\s*)?(ال)?بلاغ/,
  /اكتب\s*(لي\s*)?(ال)?(بلاغ|شكوى)/,
  /جهّ?ز\s*(لي\s*)?(ال)?(بلاغ|شكوى)/,
  /(أريد|اريد|ابغى|أبغى|ودي|بدي)\s*(أن\s*)?(أقدم|اقدم|تقديم|رفع)\s*(ال)?(بلاغ|شكوى)/,
  /تقديم\s*(ال)?(بلاغ|شكوى)/,
  /رفع\s*(ال)?(بلاغ|شكوى)/,
  /create\s+(the\s+)?complaint/i,
  /file\s+(a\s+)?complaint/i,
]

/** Questions *about* complaints that must not be mistaken for a request. */
const QUESTION_PATTERN = /^(كيف|ما|ماذا|متى|أين|اين|هل|وش|ايش|أيش|كم)\b/

export function wantsToCreateComplaint(rawMessage: string): boolean {
  const message = rawMessage.trim()
  if (message === '') return false

  if (DIRECT_PATTERNS.some((pattern) => pattern.test(message))) {
    // "كيف أقدم شكوى؟" is a request for guidance, not for the builder.
    return !QUESTION_PATTERN.test(message)
  }

  if (QUESTION_PATTERN.test(message)) return false

  return ACTION_PATTERN.test(message) && OBJECT_PATTERN.test(message)
}

/** The assistant's reply when it offers to build the complaint. */
export const COMPLAINT_CTA_MESSAGE = `أصبحت الشكوى جاهزة تقريباً.

لإنشاء البلاغ وحفظه في حسابك، اضغط على الزر أدناه.`
