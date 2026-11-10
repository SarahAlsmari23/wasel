/**
 * Intent-first assessment of a chat message — deterministic, no model call.
 *
 * Production defect it fixes: the conversation «ميسييي انتت» → «تشجع الهلال
 * ولا النصر» → «كيف اقدر اسوي كبسة من الموية» selected the National Water
 * Company, started a water complaint and showed the water website. A single
 * sector word ("الموية") was enough to (1) lift the out-of-scope shortcut,
 * (2) select an authority by keyword, (3) let nearest-document retrieval pick
 * an authority for small talk, and (4) override the model's own correct
 * "out of scope" reading.
 *
 * Rule: an authority is only ever selected on *governmental evidence* — an
 * authority named, or a sector word together with a service issue or a
 * service context (bill, meter, complaint, subscription, …). A sector word
 * alone is not evidence, and an everyday topic (cooking, sports, health,
 * entertainment, …) is out of scope even when it mentions water or
 * electricity. Messages with no evidence either way are `unclear`: the model
 * still answers them, but an authority is attached only if the model itself
 * treats the message as governmental and retrieval is highly confident.
 */
import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'
import { detectSectorByKeyword, hasCorrectionMarker } from '@/lib/ai/entity-detection'
import {
  hasGrievanceSignal,
  isGreetingOnly,
  isIdentityQuestion,
  isObviousOutOfScope,
} from '@/lib/ai/intent-guards'
import {
  describesProblem,
  isInformationQuestion,
  isOnlyComplaintRequest,
} from '@/lib/ai/problem-signal'
import type { Sector } from '@/lib/complaints/sectors'

export type MessageIntentKind =
  /** States a service problem (or asks to complain about one) with evidence. */
  | 'complaint'
  /** Asks about a governmental service / procedure with evidence. */
  | 'service_inquiry'
  /** A problem or complaint request with no identifiable service ("عندي مشكلة"). */
  | 'ambiguous_problem'
  /** Everyday topic outside Wasel's scope, or an injection attempt. */
  | 'out_of_scope'
  | 'greeting'
  | 'identity'
  /** No governmental evidence and no known everyday topic. */
  | 'unclear'

export type IntentAssessment = {
  kind: MessageIntentKind
  /** Only set when the evidence identifies one supported sector. */
  sector: Sector | null
  /** Why — short codes for logs and tests (never message content). */
  reasons: string[]
}

const AR = '\\u0600-\\u06FF'
const w = (s: string) => `(?<![${AR}])(?:[وفبلك])?(?:ال|لل)?${s}(?![${AR}])`
const stem = (s: string) => `(?<![${AR}])(?:[وفبلك])?(?:ال|لل)?${s}`

/** Everyday topics — normalised Arabic (ة→ه, ى→ي, أ→ا) and English. */
const OUT_OF_SCOPE_TOPICS: { code: string; pattern: RegExp }[] = [
  {
    code: 'cooking',
    pattern: new RegExp(
      `${stem('كبس')}|${stem('مندي')}|${w('مضغوط')}|${stem('طبخ')}|${w('اطبخ')}|${stem('وصف(?:ه|ات)')}|${w('مقادير')}|${w('اسوي (?:اكل|اكله|غدا|عشا|فطور|كيك|حلا|قهوه|شاهي)')}|\\b(?:recipes?|cook(?:ing)?|bake|baking)\\b`,
      'i',
    ),
  },
  {
    code: 'sports',
    pattern: new RegExp(
      `${w('تشجع')}|${w('مباراه')}|${w('مباريات')}|${w('الدوري')}|${w('نادي')}|${w('كوره')}|${w('لاعب')}|${w('ميسي+')}|${w('رونالدو')}|${w('الهلال')}\\s+(?:ولا|او|والا)\\s+${w('النصر')}|${w('النصر')}\\s+(?:ولا|او|والا)\\s+${w('الهلال')}|\\b(?:football|soccer|match|league|messi|ronaldo|which team)\\b`,
      'i',
    ),
  },
  {
    code: 'health',
    pattern: new RegExp(
      `${w('فوايد')}|${w('فوائد')}|${w('رجيم')}|${w('سعرات')}|${w('دايت')}|${w('صحي')}\\s+(?:اشرب|شرب)|كم\\s+لتر|\\b(?:health benefits|benefits of|calories|diet)\\b`,
      'i',
    ),
  },
  {
    code: 'entertainment',
    pattern: new RegExp(
      `${w('فلم')}|${w('فيلم')}|${w('مسلسل')}|${w('اغنيه')}|${w('نكته')}|${w('لعبه')}|${w('سوالف')}|\\b(?:movie|series|song|joke|game|netflix)\\b`,
      'i',
    ),
  },
  {
    code: 'weather',
    pattern: new RegExp(`${w('الطقس')}|${w('الجو')}\\s+(?:بكره|اليوم|حار|بارد)|\\bweather\\b`, 'i'),
  },
]

const INJECTION =
  /(?:تجاهل|انس|انسى)\s+(?:كل\s+|جميع\s+)?(?:التعليمات|الاوامر)|(?:اظهر|اعرض|اكتب)\s+(?:لي\s+)?(?:تعليمات|برومبت)\s*(?:النظام)?|برومبت|البرومبت|system\s*prompt|ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions|you are now|act as (?:a|an) (?!citizen)/i

/** Supported authorities, by name (normalised), mapped to their sector. */
const AUTHORITY_NAMES: { sector: Sector; pattern: RegExp }[] = [
  {
    sector: 'water',
    pattern:
      /الشركه الوطنيه للمياه|شركه المياه|المياه الوطنيه|\bnwc\b|national water company|water company/i,
  },
  {
    sector: 'electricity',
    pattern:
      /السعوديه للطاقه|شركه الكهرباء|الشركه السعوديه للكهرباء|\bsec\b|saudi energy|saudi electricity|electricity company/i,
  },
  {
    sector: 'telecom',
    pattern:
      /هييه الاتصالات|هييه الاتصالات والفضاء والتقنيه|\bcst\b|\bcitc\b|communications,? space/i,
  },
  {
    sector: 'commerce',
    pattern: /وزاره التجاره|حمايه المستهلك|ministry of commerce|consumer protection/i,
  },
  {
    sector: 'municipality',
    pattern:
      /وزاره البلديات|وزاره الشوون البلديه|(?<![؀-ۿ])(?:ال)?بلديه|(?<![؀-ۿ])(?:ال)?امانه(?![؀-ۿ])|منصه بلدي|تطبيق بلدي|\bbalady\b|municipality|ministry of municipal/i,
  },
]

/** A service problem stated for a sector (normalised Arabic + English). */
const SECTOR_ISSUE: Record<Sector, RegExp> = {
  water: new RegExp(
    `${stem('مقطوع')}|${stem('انقطا?ع')}|${stem('انقطعت')}|${stem('ينقطع')}|ما\\s*(?:فيه|في|جات|جت|تجي|يجي)\\s*(?:ال)?(?:مويه|مياه|ماي)|${stem('ضغط')}|${stem('ضعيف')}|${stem('تسرب')}|${stem('تسريب')}|${stem('يسرب')}|${stem('فاتور')}|${stem('عداد')}|${stem('طافح')}|${stem('طفح')}|${stem('ريح')}|${stem('عكر')}|${stem('ملوث')}|${stem('تلوث')}|${stem('توصيل')}|${stem('ارتفع')}|\\b(?:cut off|no water|leak\\w*|pressure|bill\\w*|meter|overflow\\w*|dirty|contaminat\\w*|sewage|outage|connection)\\b`,
    'i',
  ),
  electricity: new RegExp(
    `${stem('مقطوع')}|${stem('انقطا?ع')}|${stem('انقطعت')}|${stem('ينقطع')}|${stem('طاف(?:ي|يه|ت)')}|${stem('تطفي')}|${stem('فصل')}|${stem('فاتور')}|${stem('عداد')}|${stem('جهد')}|${stem('تذبذب')}|${stem('عمود')}|${stem('اسلاك')}|${stem('شرار')}|${stem('تماس')}|${stem('ارتفع')}|\\b(?:outage|power cut|blackout|cut\\w*|bill\\w*|meter|voltage|no power|disconnect\\w*|pole)\\b`,
    'i',
  ),
  telecom: new RegExp(
    `${stem('مقطوع')}|${stem('انقطا?ع')}|${stem('فاصل')}|${stem('فصل')}|${stem('بطي')}|${stem('بطء')}|${stem('ضعيف')}|${stem('ضعف')}|${stem('تغطي')}|${stem('اشار')}|${stem('سيي')}|${stem('فاتور')}|${stem('خصم')}|${stem('خصمو')}|${stem('رصيد')}|${stem('اشتراك')}|${stem('الغاء')}|${stem('باق')}|ما\\s*(?:يشتغل|يجيب|تشتغل)|\\b(?:slow|outage\\w*|down|no (?:signal|internet|service)|coverage|signal|bill\\w*|charged|overcharg\\w*|deducted|cancel\\w*|subscription|not working|bundle)\\b`,
    'i',
  ),
  commerce: new RegExp(
    `${stem('معيب')}|${stem('تالف')}|${stem('عيب')}|${stem('خربان')}|${stem('مكسور')}|${stem('مقلد')}|${stem('غش')}|${stem('نصب')}|${stem('استرجاع')}|${stem('استرداد')}|${stem('ارجاع')}|${stem('رجع')}|${stem('تاخر')}|${stem('وصل')}|${stem('تسليم')}|${stem('ضمان')}|${stem('رفض')}|${stem('سعر')}|${stem('تخفيض')}|${stem('عربون')}|${stem('طلب')}|${stem('دفعت')}|${stem('فلوس')}|\\b(?:refund\\w*|deliver\\w*|arriv\\w*|defect\\w*|faulty|fake|counterfeit|broken|damaged|charged|return\\w*|warranty|order|scam\\w*|price|paid)\\b`,
    'i',
  ),
  municipality: new RegExp(
    `${stem('حفر')}|${stem('رصيف')}|${stem('ارصف')}|${stem('زبال')}|${stem('نفايات')}|${stem('قمام')}|${stem('اناره')}|${stem('مطب')}|${stem('اسفلت')}|${stem('انقاض')}|${stem('تشوه')}|${stem('كلاب')}|${stem('مخلفات')}|${stem('حديق')}|${stem('تصريح')}|${stem('رخص')}|\\b(?:pothole\\w*|sidewalk|pavement|garbage|trash|waste|street ?light\\w*|debris|permit|licen[cs]e)\\b`,
    'i',
  ),
}

/** Service / complaint context words, any sector. */
const SERVICE_CONTEXT = new RegExp(
  `${stem('شكو')}|${stem('شكاو')}|${stem('بلاغ')}|${w('اشتكي')}|${stem('اعتراض')}|${w('اعترض')}|${stem('مطالب')}|${stem('خدمه العملاء')}|${w('الرقم الموحد')}|${w('رقم التواصل')}|${stem('تقديم')}|${w('اقدم')}|${stem('مراجع')}|${stem('متابع')}|${stem('اشتراك')}|${stem('فاتور')}|${stem('عداد')}|${w('الجهه المختصه')}|${stem('مسوول')}|${stem('اختصاص')}|${w('تختص')}|${stem('مختص')}|${stem('رسوم')}|${stem('مخالف')}|${stem('غرام')}|\\b(?:complain\\w*|report\\w*|object\\w*|dispute|customer service|hotline|contact|submit\\w*|follow ?up|track\\w*|subscription|bill\\w*|meter|handles?|responsible|authority|entity|fines?|fees?)\\b`,
  'i',
)

const PURCHASE = new RegExp(
  `${w('طلبت')}|${w('اشتريت')}|${w('شريت')}|${w('دفعت')}|${w('شحنه')}|\\b(?:i ordered|i bought|i purchased|i paid)\\b`,
  'i',
)

const QUESTION_START =
  /^(?:كيف|وين|فين|متي|هل|ما|ماذا|وش|ايش|كم|لماذا|ليش|من\s+(?:وين|فين)|اين|ابي اعرف|ودي اعرف|how|where|what|when|can|could|is|are|do|does|who|which|why)(?![؀-ۿ\w])/i

function matchedTopic(normalized: string, raw: string): string | null {
  for (const topic of OUT_OF_SCOPE_TOPICS) {
    if (topic.pattern.test(normalized) || topic.pattern.test(raw)) return topic.code
  }
  return null
}

function namedAuthoritySector(normalized: string, raw: string): Sector | null {
  const found = new Set<Sector>()
  for (const a of AUTHORITY_NAMES)
    if (a.pattern.test(normalized) || a.pattern.test(raw)) found.add(a.sector)
  return found.size === 1 ? [...found][0] : null
}

/**
 * Classifies one message. `inComplaint` = the user is inside an active
 * complaint flow (answers to collection questions are handled by the
 * route's own interruption logic; this only decides scope and evidence).
 */
export function assessIntent(message: string): IntentAssessment {
  const raw = message.trim()
  const normalized = normalizeArabicInput(raw).toLowerCase()
  const reasons: string[] = []

  if (INJECTION.test(normalized) || INJECTION.test(raw)) {
    return { kind: 'out_of_scope', sector: null, reasons: ['injection'] }
  }

  // A purchase with a delivery/defect/refund problem is a commerce matter
  // even without a store word ("طلبت جوال ودفعت 3200 ريال وما وصل").
  const purchase =
    PURCHASE.test(normalized) && SECTOR_ISSUE.commerce.test(normalized.replace(PURCHASE, ' '))
  const keywordSector = detectSectorByKeyword(raw) ?? (purchase ? 'commerce' : null)
  const authoritySector = namedAuthoritySector(normalized, raw)
  const sector = authoritySector ?? keywordSector
  if (authoritySector) reasons.push('authority-named')
  else if (keywordSector) reasons.push('sector-word')

  const issue = sector
    ? SECTOR_ISSUE[sector].test(normalized) || SECTOR_ISSUE[sector].test(raw)
    : false
  const service = SERVICE_CONTEXT.test(normalized) || SERVICE_CONTEXT.test(raw)
  const grievance = hasGrievanceSignal(raw) || describesProblem(raw)
  if (issue) reasons.push('sector-issue')
  if (service) reasons.push('service-context')
  if (grievance) reasons.push('grievance')

  const topic = matchedTopic(normalized, raw) ?? (isObviousOutOfScope(raw) ? 'general' : null)
  // An everyday topic wins over a stray sector word; it only yields to an
  // authority being named together with an issue or complaint context.
  if (topic && !(authoritySector && (issue || service))) {
    return { kind: 'out_of_scope', sector: null, reasons: [...reasons, `topic:${topic}`] }
  }

  // A self-correction naming a sector ("لا قصدي الكهرباء مو الموية") is new
  // information about the same complaint, not small talk.
  const correction = Boolean(keywordSector) && hasCorrectionMarker(raw)
  if (correction) reasons.push('correction')
  if (correction && !topic) return { kind: 'complaint', sector: keywordSector, reasons }

  // Two signals: a sector word together with a service issue, a service
  // context, or a stated problem — never the sector word alone.
  const evidence = Boolean(authoritySector) || (Boolean(sector) && (issue || service || grievance))
  // Greetings and identity questions only when nothing governmental is said
  // (the identity matcher is fuzzy: «النت بطيء» must stay a complaint).
  if (!evidence && !grievance && !service) {
    if (isGreetingOnly(raw)) return { kind: 'greeting', sector: null, reasons: ['greeting'] }
    if (isIdentityQuestion(raw)) return { kind: 'identity', sector: null, reasons: ['identity'] }
  }
  const asksQuestion =
    QUESTION_START.test(normalized) || QUESTION_START.test(raw) || isInformationQuestion(raw)

  if (evidence && sector) {
    // A question about the procedure is an inquiry; a stated problem (even
    // ending with "وين أشتكي؟") or an explicit request to complain is a
    // complaint.
    // A message that opens as a question ("كيف أعترض…", "Can I complain…")
    // asks about the procedure.
    const opensAsQuestion = QUESTION_START.test(normalized) || QUESTION_START.test(raw)
    const statesProblem = describesProblem(raw) && !isInformationQuestion(raw)
    if (opensAsQuestion || (asksQuestion && !statesProblem)) {
      return { kind: 'service_inquiry', sector, reasons }
    }
    if (issue || grievance) return { kind: 'complaint', sector, reasons }
    return { kind: 'service_inquiry', sector, reasons }
  }
  if (grievance || isOnlyComplaintRequest(raw)) {
    return { kind: 'ambiguous_problem', sector: null, reasons }
  }
  if (service) {
    // "كيف أقدم شكوى؟" — governmental, but which service is unknown.
    return { kind: 'ambiguous_problem', sector: null, reasons }
  }
  return { kind: 'unclear', sector: null, reasons }
}

/** Kinds for which retrieval may select an authority. */
export function allowsRouting(kind: MessageIntentKind): boolean {
  return kind === 'complaint' || kind === 'service_inquiry'
}
