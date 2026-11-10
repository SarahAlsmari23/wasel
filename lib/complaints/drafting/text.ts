/**
 * Text utilities shared by fact extraction, the letter validator and the
 * deterministic fallback. Pure functions, no I/O.
 */
import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_INDIC = '۰۱۲۳۴۵۶۷۸۹'

/** Arabic-Indic / Persian digits → ASCII, Arabic thousands/decimal marks → ASCII. */
export function asciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_INDIC.indexOf(d)))
    .replace(/٬/g, ',')
    .replace(/٫/g, '.')
}

/** Normalised form for containment checks: Arabic letter variants unified,
 * diacritics removed, digits ASCII, punctuation → space, lower-case. */
export function norm(text: string): string {
  return normalizeArabicInput(asciiDigits(text))
    .toLowerCase()
    .replace(/[«»"'“”‘’()[\]{}<>]/g, ' ')
    .replace(/[؟?!،,.:؛;\-–—_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Every number written in the text, as a canonical string ("1,500.00" →
 * "1500", "٩٠٠" → "900"). Phone-like and reference-like digit runs included. */
export function extractNumbers(text: string): string[] {
  const out: string[] = []
  for (const match of asciiDigits(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    out.push(canonicalNumber(match[0]))
  }
  return out
}

export function canonicalNumber(raw: string): string {
  let value = raw.replace(/,(?=\d{3}\b)/g, '').replace(/,/g, '')
  if (value.includes('.')) value = value.replace(/\.?0+$/, '')
  return value.replace(/^0+(?=\d)/, (zeros) => (value.length > 4 ? zeros : ''))
}

const CURRENCY = String.raw`(?:ريال(?:ا|اً|ات)?|ر\.?\s?س|رس|sar|sr|riyals?|rials?|﷼)`

export type AmountFact = { value: string; currency: 'SAR' | null; quote: string }

/** Monetary amounts: a number next to a currency word, or next to an
 * amount/bill word ("فاتورتي صارت 900"). */
export function extractAmounts(text: string): AmountFact[] {
  const source = asciiDigits(text)
  const found = new Map<string, AmountFact>()
  const withCurrency = new RegExp(String.raw`(\d[\d,]*(?:\.\d+)?)\s*${CURRENCY}`, 'gi')
  for (const m of source.matchAll(withCurrency)) {
    const value = canonicalNumber(m[1])
    found.set(value, { value, currency: 'SAR', quote: m[0] })
  }
  const contextual =
    /(?:فاتور\S*|مبلغ|المبلغ|قيم\S*|سعر\S*|دفعت|سددت|خصم\S*|رصيد\S*|bill|amount|charged|paid|price|cost|refund)\D{0,25}?(\d[\d,]*(?:\.\d+)?)/gi
  // "صارت 900 ريال وكانت 150": a number after was/became, once an amount exists.
  const comparative =
    /(?:كانت|كان|صارت|صار|اصبحت|أصبحت|بدل|بدلا من|بدلاً من|العادة|العاده|عادة|المعتاد|معتاد|متوسط|حسبوه|حسبوها|تتعدى|يتعدى|was|were|used to be|from|instead of|usually|normally|usual)\s+(\d[\d,]*(?:\.\d+)?)(?!\s*(?:يوم|ايام|أيام|شهر|اشهر|أشهر|سن|ساع|دقيق|مر|day|week|month|year|hour|minute|time|[/-]))/gi
  for (const m of source.matchAll(contextual)) {
    const value = canonicalNumber(m[1])
    if (value.length > 7) continue
    if (!found.has(value)) found.set(value, { value, currency: null, quote: m[0] })
  }
  if (found.size > 0) {
    for (const m of source.matchAll(comparative)) {
      const value = canonicalNumber(m[1])
      if (value.length <= 7 && !found.has(value))
        found.set(value, { value, currency: null, quote: m[0] })
    }
  }
  return [...found.values()]
}

const AR_MONTHS =
  'يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع الأول|ربيع الآخر|ربيع الثاني|جمادى الأولى|جمادى الآخرة|رجب|شعبان|رمضان|شوال|ذو القعدة|ذو الحجة'
const EN_MONTHS =
  'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec'

/** Explicit dates and time references the user wrote. Returned as the
 * user's own wording (the letter may rephrase relative ones, never invent). */
export function extractDates(text: string): string[] {
  const source = asciiDigits(text)
  const patterns = [
    /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/g,
    new RegExp(String.raw`\d{1,2}\s*(?:من\s*)?(?:${AR_MONTHS})(?:\s*\d{4})?`, 'g'),
    new RegExp(
      String.raw`\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:${EN_MONTHS})\b(?:\s+\d{4})?`,
      'gi',
    ),
    new RegExp(String.raw`\b(?:${EN_MONTHS})\s+\d{1,2}(?:st|nd|rd|th)?\b(?:,?\s+\d{4})?`, 'gi'),
    /\b(?:14|20)\d{2}\s*(?:هـ|م|ه)?(?=\s|$)/g,
  ]
  const out: string[] = []
  for (const pattern of patterns) {
    for (const m of source.matchAll(pattern)) out.push(cleanSpaces(m[0]))
  }
  const unique = [...new Set(out)]
  // "2026" alone is not a second date when "3 مارس 2026" was found.
  return unique.filter((d) => !unique.some((other) => other !== d && other.includes(d)))
}

/** Reference-like identifiers: 5+ digit runs or letter+digit codes. */
export function extractReferences(text: string): string[] {
  const source = asciiDigits(text)
  const out = new Set<string>()
  for (const m of source.matchAll(/\b[A-Za-z]{0,4}-?\d{5,}\b/g)) out.add(m[0])
  return [...out]
}

/** Count words the letter must not invent ("three times", "مرتين"). */
export const COUNT_WORDS_PATTERN =
  /(?:مرتين|ثلاث مرات|اربع مرات|خمس مرات|عشر مرات|مره واحده|twice|three times|four times|five times|ten times)/g

const DIALECT_WORDS = [
  'وين',
  'وش',
  'ايش',
  'ابي',
  'ابغي',
  'ابغا',
  'نبي',
  'يبي',
  'ودي',
  'مو',
  'مب',
  'موب',
  'كلمتهم',
  'كلمته',
  'الموية',
  'المويه',
  'مويه',
  'عشان',
  'علشان',
  'الحين',
  'اللحين',
  'يعني',
  'بس',
  'زي',
  'حقتي',
  'حقي',
  'صار',
  'صارت',
  'ماني',
  'ترا',
  'تراني',
  'شلون',
  'ليش',
  'ياخي',
  'والله',
  'يرجعون',
  'يردون',
  'يعدلونها',
  'يشوفون',
  'شي',
]
const DIALECT_PATTERN = new RegExp(
  `(?<![\\u0600-\\u06FF])[وفبل]?(?:${DIALECT_WORDS.join('|')})(?![\\u0600-\\u06FF])`,
  'g',
)
/** Saudi colloquial words that do not belong in a formal letter. */
export function dialectWords(text: string): string[] {
  return [...new Set(normalizeArabicInput(text).match(DIALECT_PATTERN) ?? [])]
}

const ENGLISH_INFORMAL =
  /\b(?:gonna|wanna|gotta|crazy|a bunch|nobody fixed|kinda|sorta|ya|u r|pls|plz|lol|omg|super annoying|super|literally|ghosted|ripped off)\b/gi
export function informalEnglish(text: string): string[] {
  return [...new Set((text.match(ENGLISH_INFORMAL) ?? []).map((w) => w.toLowerCase()))]
}

export function arabicRatio(text: string): number {
  const letters = text.match(/[A-Za-z؀-ۿ]/g) ?? []
  if (letters.length === 0) return 0
  return letters.filter((c) => /[؀-ۿ]/.test(c)).length / letters.length
}

/** Messages with nothing to put in a letter ("شكراً", "تمام", "hi"). */
const TRIVIAL =
  /^(?:شكرا|شكرا لك|مشكور|يعطيك العافيه|تمام|طيب|اوك|اوكي|ok|okay|thanks|thank you|thx|نعم|ايه|اي|لا|yes|no|السلام عليكم|هلا|مرحبا|hi|hello|hey)$/
export function isTrivialMessage(text: string): boolean {
  return TRIVIAL.test(norm(text))
}

const QUANTITY_UNITS =
  'يوم|يوما|يوماً|ايام|أيام|اسبوع|أسبوع|اسابيع|أسابيع|شهر|شهور|اشهر|أشهر|ساعه|ساعة|ساعات|دقيقه|دقيقة|دقائق|مرات|ميجابت|ميقا|جيجا|days?|weeks?|months?|hours?|minutes?|times(?: a day)?|mbps|gb|percent'

/** Durations and other quantities the user gave ("10 أيام", "5 ميجابت",
 * "50%", "9 days") — excluding amounts (handled separately). */
export function extractQuantities(text: string): string[] {
  const source = asciiDigits(text)
  const out: string[] = []
  const re = new RegExp(
    String.raw`(\d[\d,]*(?:\.\d+)?)\s*(?:(${QUANTITY_UNITS})(?![؀-ۿA-Za-z])|(%))`,
    'gi',
  )
  for (const m of source.matchAll(re)) {
    out.push(m[3] ? `${canonicalNumber(m[1])}%` : `${canonicalNumber(m[1])} ${m[2]}`)
  }
  const amounts = new Set(extractAmounts(text).map((a) => a.value))
  return [...new Set(out)].filter((q) => !amounts.has(q.split(/[ %]/)[0]))
}

const CORRECTION_MARKER =
  /(?:قصدي|اقصد|أقصد|بالاصح|بالأصح|المقصود|لا لحظه|لا لحظة|لحظه لا|لحظة لا|آسف|اسف|i mean|i meant|actually|sorry,? i meant|correction)/gi
const NEGATED_VALUE = /(?:مو|مب|ليس|وليس|not|instead of)\s+(?:يوم\s+|شهر\s+|حي\s+)?(\S+)/gi
const MONTHS_AND_DAYS = new RegExp(
  `(?:${AR_MONTHS}|السبت|الاحد|الأحد|الاثنين|الإثنين|الثلاثاء|الاربعاء|الأربعاء|الخميس|الجمعة|الجمعه|${EN_MONTHS}|monday|tuesday|wednesday|thursday|friday|saturday|sunday)`,
  'gi',
)

function canonicalOrWord(value: string): string {
  const v = value.replace(/[.,،؛]+$/, '')
  return /^\d/.test(v) ? canonicalNumber(v.replace(/[^\d.,]/g, '')) : v.toLowerCase()
}

/**
 * Values the user explicitly corrected ("الفاتورة 900 ريال … لا قصدي 950 مو
 * 900", "يوم الخميس … لا قصدي الجمعة"): a number, month or weekday stated
 * before a correction marker is superseded when the corrected part gives a
 * different value of the same kind; "مو 900"/"not 900" after the marker is
 * superseded too. Deterministic and conservative (other values are kept).
 */
export function supersededValues(text: string): Set<string> {
  const source = asciiDigits(text)
  const out = new Set<string>()
  const markers = [...source.matchAll(CORRECTION_MARKER)]
  markers.forEach((marker, i) => {
    const at = marker.index ?? 0
    // Everything said before the correction ("آسف قصدي": both markers share it).
    const before = source.slice(0, at)
    const after = source.slice(at + marker[0].length, markers[i + 1]?.index ?? source.length)
    for (const m of after.matchAll(NEGATED_VALUE)) {
      if (/\d/.test(m[1]) || new RegExp(MONTHS_AND_DAYS.source, 'i').test(m[1])) {
        out.add(canonicalOrWord(m[1]))
      }
    }
    const afterClean = after.replace(NEGATED_VALUE, ' ')
    const kinds: ((t: string) => string[])[] = [
      (t) => extractNumbers(t),
      (t) => t.match(MONTHS_AND_DAYS) ?? [],
    ]
    for (const of of kinds) {
      const fresh = of(afterClean).map(canonicalOrWord)
      if (fresh.length === 0) continue
      // The correction replaces the most recent value of the same kind only.
      const previous = of(before)
        .map(canonicalOrWord)
        .filter((v) => !fresh.includes(v))
      const last = previous[previous.length - 1]
      if (last !== undefined) out.add(last)
    }
  })
  return out
}

/** A date/quantity phrase whose value the user corrected. */
export function isSuperseded(value: string, superseded: Set<string>): boolean {
  return superseded.has(value.toLowerCase()) || extractNumbers(value).some((n) => superseded.has(n))
}
