/**
 * Independent scoring of a complaint letter against its scenario. Written
 * separately from lib/complaints/drafting/validate.ts on purpose: the
 * pipeline's own validator never grades its own output here.
 */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const ascii = (t) => t.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
export const normalize = (t) =>
  ascii(t)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ئؤ]/g, (c) => (c === 'ئ' ? 'ي' : 'و'))
    .replace(/[ً-ْـ]/g, '')
    .toLowerCase()
    .replace(/[«»"'“”()[\]{}<>؟?!،,.:؛;\-–—/\\%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const numbersIn = (t) =>
  [...ascii(t).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) =>
    m[0].replace(/,/g, '').replace(/\.0+$/, ''),
  )

const NUMBER_WORDS = {
  2: /\b(two|twice)\b|مرتين|اثنين|يومين/,
  3: /\b(three)\b|ثلاث/,
  4: /\b(four)\b|اربع/,
  5: /\b(five)\b|خمس/,
  6: /\b(six)\b|ست(?:ه)? /,
  9: /\b(nine)\b|تسع/,
  10: /\b(ten)\b|عشر/,
  20: /\b(twenty)\b|عشرين/,
  50: /\b(fifty)\b|خمسين/,
}

const DIALECT =
  /(?<![؀-ۿ])[وفب]?(?:وين|وش|ايش|ابي|ابغي|ابيها|ابيهم|مو|مب|كلمتهم|المويه|مويه|الكهربا|عشان|للحين|الحين|يعني|بس|زي|جت|طلعت|خربان|خربت|شريت|طافيه|طافحه|فاصله|ريحه|كذا مره|يرجعون|يردون|ما رد|حقي|حقتي|صار|صارت|ركبوا|سووا|جوا|جا|ما جا|العيال)(?![؀-ۿ])/
const INFORMAL_EN =
  /\b(gonna|wanna|crazy|a bunch|like \d|super|literally|ghosted|nobody fixed|kinda|annoying)\b/i
const FILLER = /وفق الانظمه والاجراءات المعمول بها/
const REQUEST =
  /(?:ارجو|آمل|امل|اطلب|نامل|يرجي|اامل|التكرم|request|kindly|ask that|i ask|would be grateful|please)/
const CONTACT =
  /(?:تواصل|اتصل|راجعت|سبق|ابلغت|بلغت|رفعت|قدمت بلاغ|contacted|called|reached out|reported|raised|previously)/
const GENERIC_SUBJECTS = new Set(
  [
    'شكوى بشأن خدمة المياه',
    'شكوى بشأن خدمة الكهرباء',
    'شكوى بشأن خدمة الاتصالات',
    'شكوى ضد جهة تجارية',
    'بلاغ بشأن الخدمات البلدية',
    'شكوى ضد متجر إلكتروني',
    'Complaint regarding water services',
    'Complaint regarding electricity services',
    'Complaint regarding telecommunications services',
    'Complaint against a commercial business',
    'Report regarding municipal services',
  ].map(normalize),
)
const WRONG_AUTHORITIES =
  /(?:وزاره الكهرباء|وزاره المياه|وزاره الاتصالات|الشركه السعوديه للكهرباء|الشركه السعوديه للطاقه|وزاره الشوون البلديه|هييه حمايه المستهلك|وزاره الداخليه|اداره المرور|saudi electricity company|ministry of electricity|ministry of water)/

const EN_NAMES = {
  'الشركة الوطنية للمياه': 'National Water Company',
  'السعودية للطاقة': 'Saudi Energy (SE)',
  'هيئة الاتصالات والفضاء والتقنية': 'Communications, Space & Technology Commission (CST)',
  'وزارة التجارة': 'Ministry of Commerce',
  'وزارة البلديات والإسكان': 'Ministry of Municipalities and Housing',
}

/** The letter body without the frame lines. */
function splitLetter(text) {
  const lines = text.split('\n')
  const subjectLine = lines.find((l) => /^(?:الموضوع|Subject):/.test(l)) ?? ''
  const body = lines
    .filter(
      (l) =>
        !/^(?:إلى|To|الموضوع|Subject|الاسم|Name):/.test(l) &&
        !/^(?:السلام عليكم|Dear |وتفضلوا|Yours )/.test(l),
    )
    .join('\n')
    .trim()
  return { subject: subjectLine.replace(/^(?:الموضوع|Subject):\s*/, ''), body }
}

export function finalInputs(c) {
  const fields = c.edit?.fields ? { ...c.fields, ...c.edit.fields } : c.fields
  const turns = c.edit?.fields ? [] : c.turns
  const locale = c.edit?.locale ?? c.locale
  return { fields, turns, locale, style: c.edit?.style ?? 'standard' }
}

export function scoreLetter(c, letterText) {
  const { fields, turns, locale } = finalInputs(c)
  const userText = [...turns, ...Object.values(fields)].join('\n')
  const { subject, body } = splitLetter(letterText)
  const letterNorm = normalize(letterText)
  const bodyNorm = normalize(body)
  const checks = []
  const add = (name, ok, severity, detail = '') => checks.push({ name, ok, severity, detail })

  // Authority
  const expectedTo = locale === 'en' ? `To: ${EN_NAMES[c.entityName]}` : `إلى: ${c.entityName}`
  add('authority-exact', letterText.startsWith(expectedTo), 'critical', letterText.split('\n')[0])
  add('no-wrong-authority', !WRONG_AUTHORITIES.test(letterNorm), 'critical')

  // Numbers
  // Numbers inside a corrected value ("3 نوفمبر") are superseded too.
  const superseded = new Set(c.superseded.flatMap(numbersIn))
  const forbidNumbers = new Set(c.forbid.flatMap(numbersIn))
  const userNums = new Set(numbersIn(userText))
  const nums = userNums
  const diffs = new Set()
  for (const a of nums) for (const b of nums) if (+a > +b) diffs.add(String(+a - +b))
  const letterNums = numbersIn(letterText)
  const fabricated = letterNums.filter((n) => !userNums.has(n) && !diffs.has(n))
  add('no-fabricated-numbers', fabricated.length === 0, 'critical', fabricated.join(','))
  const required = [...new Set(numbersIn(userText))].filter(
    (n) => !superseded.has(n) && !forbidNumbers.has(n),
  )
  const missing = required.filter(
    (n) => !letterNums.includes(n) && !(NUMBER_WORDS[n] && NUMBER_WORDS[n].test(letterNorm)),
  )
  add('keeps-numbers', missing.length === 0, 'high', missing.join(','))
  // Superseded values (numbers or words)
  const stale = c.superseded.filter((s) =>
    /^\d+$/.test(s) ? letterNums.includes(s) : letterNorm.includes(normalize(s)),
  )
  add('no-superseded', stale.length === 0, 'critical', stale.join(','))
  // Forbidden (never-said) claims
  const forbidden = c.forbid.filter((f) =>
    /^\d+$/.test(f) ? letterNums.includes(f) : bodyNorm.includes(normalize(f)),
  )
  add('no-unsupported-claims', forbidden.length === 0, 'critical', forbidden.join(','))

  // Form
  add('no-question', !/[؟?]/.test(letterText), 'high')
  if (locale === 'ar') {
    const d = bodyNorm.match(DIALECT)
    add('formal-register', !d, 'high', d?.[0] ?? '')
    add(
      'language',
      (body.match(/[؀-ۿ]/g) ?? []).length / Math.max(1, (body.match(/[A-Za-z؀-ۿ]/g) ?? []).length) >
        0.85,
      'high',
    )
  } else {
    const m = body.match(INFORMAL_EN)
    add('formal-register', !m, 'high', m?.[0] ?? '')
    const arabicLeft = Object.values(fields).reduce((t, v) => t.split(v).join(''), body)
    add('language', !/[؀-ۿ]{3,}/.test(arabicLeft), 'high')
  }
  // Pasted colloquial text (6-word windows of informal turns).
  let pasted = ''
  for (const t of turns) {
    const words = normalize(t).split(' ')
    // Only informal wording counts as "pasted": a clean, formal sentence
    // from the user may legitimately be reused.
    if (
      !DIALECT.test(normalize(t)) &&
      !INFORMAL_EN.test(t) &&
      !/[؟?]|\b\w+'(?:s|t|ve|re|ll|m)\b/.test(t)
    )
      continue
    for (let i = 0; i + 6 <= words.length && !pasted; i++) {
      const span = words.slice(i, i + 6).join(' ')
      if (bodyNorm.includes(span)) pasted = span
    }
  }
  add('no-pasted-user-text', !pasted, 'high', pasted)
  add('no-filler', !FILLER.test(bodyNorm), 'low')

  // Content
  add('has-request', REQUEST.test(bodyNorm), 'medium')
  if (c.expectContact) add('mentions-prior-contact', CONTACT.test(bodyNorm), 'medium')
  add(
    'specific-subject',
    subject !== '' && !GENERIC_SUBJECTS.has(normalize(subject)),
    'low',
    subject,
  )
  const words = body.split(/\s+/).filter(Boolean).length
  const maxWords = c.edit?.style === 'shorter' ? 120 : 230
  add('concise', words >= 20 && words <= maxWords, 'low', String(words))

  return { checks, words }
}

export const SEVERITY_WEIGHT = { critical: 5, high: 3, medium: 2, low: 1 }
export function qualityScore(checks) {
  const total = checks.reduce((n, c) => n + SEVERITY_WEIGHT[c.severity], 0)
  const got = checks.filter((c) => c.ok).reduce((n, c) => n + SEVERITY_WEIGHT[c.severity], 0)
  return total ? Math.round((got / total) * 1000) / 10 : 0
}
