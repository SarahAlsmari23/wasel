/**
 * Independent, deterministic validation of a drafted complaint letter.
 * Never asks a model whether its own output is right: every exact value is
 * compared with the user's own words (the numbered sources) and every
 * claim category the evaluation found models inventing (legal violations,
 * damage, evidence, defects, accusations, counts, contact details, other
 * authorities) must be supported by the user's text.
 */
import type { ComplaintFacts } from '@/lib/complaints/drafting/facts'
import {
  arabicRatio,
  asciiDigits,
  COUNT_WORDS_PATTERN,
  dialectWords,
  extractNumbers,
  informalEnglish,
  norm,
} from '@/lib/complaints/drafting/text'

export type Severity = 'critical' | 'major' | 'minor'
export type ValidationIssue = { code: string; severity: Severity; detail: string }
export type ValidationResult = { ok: boolean; issues: ValidationIssue[] }

export type DraftToValidate = { subject: string; body: string }

/** Claim categories that need the user's own support. `claim` is tested on
 * the normalised draft, `support` on the normalised user text. */
const CLAIM_RULES: { code: string; claim: RegExp; support: RegExp }[] = [
  {
    code: 'unsupported-legal-claim',
    claim:
      /(?:نظام|الانظمه|انظمه|لايحه|اللوايح|الماده \d|ماده \d|مخالفه صريحه|مخالف للنظام|انتهاك|القانون|قانوني|حقوقي النظاميه|statutory|regulation|by law|the law|legal right|unlawful|illegal|violat|breach of)/,
    support: /(?:نظام|انظمه|لايحه|ماده|مخالف|انتهاك|قانون|law|legal|regulation|violat|breach)/,
  },
  {
    code: 'unsupported-damage-claim',
    claim: /(?:ضرر|اضرار|خساير|خساره|متضرر|damage|financial loss|losses|harm)/,
    support: /(?:ضرر|اضرار|خسار|خساير|تضرر|خرب|تلف|damage|loss|lost|harm|ruin)/,
  },
  {
    code: 'unsupported-compensation-claim',
    claim: /(?:تعويض|compensat)/,
    support: /(?:تعويض|عوض|compensat)/,
  },
  {
    code: 'unsupported-evidence-claim',
    claim:
      /(?:مرفق|ارفق|المرفقات|صور|صوره|لقطه شاشه|ايصال|اثبات|مستند|attached|attach|enclosed|photo|picture|screenshot|receipt|evidence|proof|document)/,
    support:
      /(?:مرفق|ارفق|صور|صوره|لقطه|سكرين|ايصال|اثبات|مستند|فاتوره الشراء|attach|photo|picture|screenshot|receipt|evidence|proof|document)/,
  },
  {
    code: 'unsupported-defect-claim',
    claim:
      /(?:عطل في العداد|عداد معطل|خلل في العداد|العداد معطل|defective meter|faulty meter|meter (?:is )?(?:faulty|defective|broken|malfunction))/,
    support: /(?:عطل|معطل|خلل|خربان|خرب|تعطل|defect|fault|broken|malfunction)/,
  },
  {
    code: 'unsupported-accusation',
    claim: /(?:احتيال|نصب|غش|تلاعب|متعمد|عمدا|سرقه|fraud|scam|deliberate|intentional|cheat|theft)/,
    support:
      /(?:احتيال|نصب|نصاب|غش|تلاعب|متعمد|عمدا|سرق|حرامي|fraud|scam|deliberate|intentional|cheat|steal|stole|theft)/,
  },
  {
    code: 'unsupported-safety-claim',
    claim:
      /(?:خطر|خطوره|السلامه العامه|سلامه السكان|سلامه الماره|danger|hazard|public safety|health risk)/,
    support:
      /(?:خطر|خطير|سلامه|صحه|صحي|مرض|اطفال|حادث|طاح|danger|hazard|safe|health|sick|accident|kids|children)/,
  },
  {
    code: 'unsupported-formal-complaint-claim',
    // Claims of *earlier* formal complaints — not the letter itself ("I am
    // writing to submit a formal complaint").
    claim:
      /(?:شكاوي رسميه|بلاغات رسميه|سبق ان قدمت (?:شكوي|بلاغا)|formal complaints|official complaints|(?:filed|lodged|submitted) (?:a |several |multiple |two |three )?(?:formal |official )?(?:complaints?|reports?) (?:before|previously|already)|previously (?:filed|lodged|submitted))/,
    support: /(?:شكوي|شكاوي|بلاغ|اشتكيت|رفعت|سجلت|complain|report|ticket)/,
  },
  {
    code: 'unsupported-deadline',
    claim: /(?:خلال \d+|في غضون|مهله|المده النظاميه|within \d+|deadline|statutory period)/,
    support: /(?:خلال|غضون|مهله|اسبوع|ايام|يوم|within|week|days|deadline)/,
  },
]

/** "وزارة X", "هيئة X", "إدارة X" … are always institution names; "شركة X" /
 * "بلدية X" only when a definite name follows ("الشركة السعودية…", not
 * "الشركة أكثر"). Normalised text (ة→ه, ئ→ي). */
const ARABIC_AUTHORITY =
  /(?<![\u0600-\u06FF])(?:ال)?(?:(?:وزاره|هييه|امانه|مصلحه|اداره)\s+[\u0600-\u06FF]+|(?:شركه|بلديه)\s+(?:ال|لل)[\u0600-\u06FF]+)/g
const ARABIC_GENERIC =
  /^(?:ال)?(?:وزاره|هييه|شركه|امانه|بلديه|مصلحه|اداره)\s+(?:المعنيه|المختصه|المذكوره|المزوده|التي|الذي|عن|في|من|مع|على|الي|بشان|ب\S*|ل\S*)$/
/** Capitalised names around Ministry/Authority/Commission/Company/… */
const ENGLISH_AUTHORITY =
  /(?:[A-Z][\w&]*\s+){0,4}(?:Ministry|Authority|Commission|Company|Corporation|Municipality|Council|Agency|Department)(?:\s+(?:of|for)(?:\s+(?:the\s+)?[A-Z][\w&]*)+)?/g

function unverifiedAuthorityNames(text: string, ctx: ValidationContext): string[] {
  const allowed = [...ctx.authorityNames, ...ctx.allowedNames].map(norm).filter(Boolean)
  const user = norm(ctx.userCorpus)
  const out: string[] = []
  for (const m of norm(text).match(ARABIC_AUTHORITY) ?? []) {
    if (ARABIC_GENERIC.test(m)) continue
    const bare = m.replace(/^ال/, '')
    if (
      allowed.some((a) => a.includes(m) || a.includes(bare)) ||
      user.includes(m) ||
      user.includes(bare)
    )
      continue
    // "شركة زين" when the user named the provider "زين".
    const second = m.split(' ')[1] ?? ''
    if (ctx.allowedNames.map(norm).some((a) => a.split(' ').includes(second))) continue
    out.push(m)
  }
  for (const raw of text.match(ENGLISH_AUTHORITY) ?? []) {
    const m = norm(raw).replace(/^(?:the|a|an|to|dear|i|we|my|this|your)\s+/, '')
    if (!/\s/.test(m)) continue // the bare word: "the company"
    if (allowed.some((a) => a.includes(m)) || user.includes(m)) continue
    out.push(raw.trim())
  }
  return out
}
const CONTACT_INFO =
  /(?:https?:\/\/\S+|www\.\S+|\b\S+@\S+\.\S+\b|\b(?:\+?966|0)?5\d{8}\b|\b9\d{3}\b|\b8001\d{6}\b)/gi
const PLACEHOLDER = /\[[^\]]{1,40}\]|\{[^}]{1,40}\}|<[^>]{1,40}>|_{3,}|\bX{3,}\b|\.\.\.\s*$/m
const FRAME_PHRASES =
  /(?:السلام عليكم|وتفضلوا بقبول|مع خالص التحيه|dear sir|dear madam|yours faithfully|yours sincerely|best regards|kind regards)/
const FILLER = /(?:وفق الانظمه والاجراءات المعمول بها|حسب الانظمه والتعليمات المتبعه)/
const GENDERED = /(?:بصفتي مواطن|المواطن[هة]?\s|مقدم[هة]? الشكوي|المشتكي[هة]?|المستفيد[هة]?\s)/

export type ValidationContext = {
  /** All the user's own text (messages + fields), raw. */
  userCorpus: string
  facts: ComplaintFacts
  /** Verified authority names (Arabic and English) for this complaint. */
  authorityNames: string[]
  /** Other names the letter may contain (provider, merchant) — user-given. */
  allowedNames: string[]
  locale: 'ar' | 'en'
}

function derivedNumbers(values: string[]): Set<string> {
  const out = new Set<string>()
  const nums = values.map(Number).filter((n) => Number.isFinite(n))
  for (const a of nums) for (const b of nums) if (a > b) out.add(String(+(a - b).toFixed(2)))
  return out
}

/** Sliding 7-word windows of a user message found verbatim in the draft. */
function copiedInformalSpan(draftNorm: string, userCorpus: string): string | null {
  for (const line of userCorpus.split('\n')) {
    const words = norm(line).split(' ')
    if (words.length < 7) continue
    if (dialectWords(line).length === 0 && informalEnglish(line).length === 0) continue
    for (let i = 0; i + 7 <= words.length; i++) {
      const span = words.slice(i, i + 7).join(' ')
      if (draftNorm.includes(span)) return span
    }
  }
  return null
}

export function validateDraft(draft: DraftToValidate, ctx: ValidationContext): ValidationResult {
  const issues: ValidationIssue[] = []
  const add = (code: string, severity: Severity, detail: string) =>
    issues.push({ code, severity, detail })
  const text = `${draft.subject}\n${draft.body}`
  const draftNorm = norm(text)
  const userNorm = norm(ctx.userCorpus)
  const userNumbers = new Set(extractNumbers(ctx.userCorpus))
  const liveAmounts = ctx.facts.amounts.filter((a) => !a.superseded)
  const allowedNumbers = new Set([
    ...userNumbers,
    ...derivedNumbers(liveAmounts.map((a) => a.value)),
  ])

  if (!draft.subject.trim() || !draft.body.trim()) add('empty', 'critical', 'empty subject or body')

  // 1. Exact values: no number the user did not give.
  for (const n of extractNumbers(text)) {
    if (!allowedNumbers.has(n)) add('fabricated-number', 'critical', n)
  }
  for (const word of draftNorm.match(COUNT_WORDS_PATTERN) ?? []) {
    if (!userNorm.includes(word)) add('fabricated-count', 'critical', word)
  }
  // 2. Superseded values must be gone.
  for (const amount of ctx.facts.amounts.filter((a) => a.superseded)) {
    if (extractNumbers(text).includes(amount.value))
      add('superseded-value', 'critical', amount.value)
  }
  // 3. Every live amount, explicit date and reference must be kept.
  const draftNumbers = new Set(extractNumbers(text))
  for (const a of liveAmounts) {
    if (!draftNumbers.has(a.value)) add('missing-amount', 'major', a.value)
  }
  for (const d of ctx.facts.dates) {
    const digits = extractNumbers(d.text)
    const kept =
      digits.length > 0
        ? digits.every((n) => draftNumbers.has(n))
        : draftNorm.includes(norm(d.text))
    if (!kept) add('missing-date', 'major', d.text)
  }
  for (const r of ctx.facts.references) {
    if (!asciiDigits(text).includes(r.text)) add('missing-reference', 'major', r.text)
  }
  // 4. Authority names: only the verified one, or names the user gave.
  for (const phrase of unverifiedAuthorityNames(text, ctx)) {
    add('unverified-authority-name', 'critical', phrase)
  }
  // 5. Contact details, links.
  for (const m of text.match(CONTACT_INFO) ?? []) {
    if (!ctx.userCorpus.includes(m)) add('fabricated-contact-info', 'critical', m)
  }
  // 6. Claim categories.
  for (const rule of CLAIM_RULES) {
    const match = draftNorm.match(rule.claim)
    if (match && !rule.support.test(userNorm)) add(rule.code, 'critical', match[0])
  }
  if (PLACEHOLDER.test(text)) add('placeholder', 'critical', 'placeholder text')
  // 7. Form and register.
  if (/[؟?]/.test(text)) add('question-in-letter', 'major', 'question mark')
  if (ctx.locale === 'ar') {
    const dialect = dialectWords(text)
    if (dialect.length > 0) add('dialect', 'major', dialect.join(', '))
    if (arabicRatio(text) < 0.8) add('wrong-language', 'major', 'not Arabic')
  } else {
    const informal = informalEnglish(text)
    if (informal.length > 0) add('informal-english', 'major', informal.join(', '))
    if (
      arabicRatio(
        text.replace(/[؀-ۿ]+(?:\s+[؀-ۿ]+)*/g, (m) => (ctx.userCorpus.includes(m) ? '' : m)),
      ) > 0.2
    )
      add('wrong-language', 'major', 'not English')
  }
  const copied = copiedInformalSpan(draftNorm, ctx.userCorpus)
  if (copied) add('copied-informal-text', 'major', copied)
  if (FRAME_PHRASES.test(norm(draft.body)))
    add('duplicated-frame', 'major', 'greeting/closing in body')
  if (draft.body.length < 120) add('too-short', 'major', String(draft.body.length))
  if (draft.body.length > 2200) add('too-long', 'minor', String(draft.body.length))
  if (draft.subject.length > 90) add('subject-too-long', 'minor', String(draft.subject.length))
  if (FILLER.test(draftNorm)) add('generic-filler', 'minor', 'وفق الأنظمة…')
  if (GENDERED.test(draftNorm)) add('gender-assumption', 'minor', 'gendered self-reference')

  return { ok: !issues.some((i) => i.severity !== 'minor'), issues }
}
