/**
 * Phase 7.7, Part 4 — deterministic entity detection, independent of
 * RAG/embedding similarity. Real user messages like "انقطعت عني الموية وأنا
 * دافع الفاتورة" or "انقطعت إمدادات المياه رغم سداد الفاتورة" name the sector
 * unambiguously (المياه/الموية), but a short, conversational phrasing like
 * this doesn't always retrieve a strongly-similar knowledge document — RAG
 * confidence is a similarity measure, not a certainty-of-topic measure, and
 * the two can legitimately diverge for perfectly ordinary phrasing. Entity
 * identification should not depend on retrieval quality when the message
 * itself already contains an unambiguous, fixed keyword for the sector.
 *
 * This is a narrow, additive signal only: it never changes what
 * `resolveRouting` (RAG-based) returns, and it's only ever consulted by the
 * caller (app/api/ai/chat/route.ts) as a fallback when RAG resolution didn't
 * produce a routing at all, or landed at 'low' confidence — it never
 * overrides a trustworthy RAG match on its own. Because this app's
 * complaint types are currently one-per-entity (see lib/ai/routing.ts's
 * Part 5 fix), resolving the entity this way necessarily resolves the
 * service/complaintType along with it — that's a fact about the current
 * data, not something this module assumes generally: it never guesses which
 * complaintType, it just resolves the sector's single service the same way
 * lib/ai/routing.ts's resolveEntityByName always does (public-read lookup,
 * never invented ids).
 */

import { normalizeArabicInput } from '@/lib/ai/arabic-normalize'
import { ENTITY_NAME_TO_SECTOR, type Sector } from '@/lib/complaints/sectors'
import { canonicalEntityName } from '@/lib/government/entity-names'

/*
 * Evaluation-driven revision (evals/, 2026-11): the previous version returned
 * the first sector whose substring matched, in a fixed order. Measured on the
 * evaluation dataset it mis-routed when the user named the authority they
 * (wrongly) meant to complain to ("أشتكي لوزارة التجارة إن الكهرباء
 * مقطوعة"), when they corrected themselves ("لا قصدي الكهربا مو الموية"), on
 * false friends ("النتيجة" ⊃ "النت", "مستأجر" ⊃ "تاجر", "تغطية التأمين",
 * "store my documents"), and whenever two sectors appeared. Now:
 *   - words match on Arabic word boundaries (with the usual و/ف/ب/ل/ك and
 *     ال/لل prefixes), not as raw substrings;
 *   - the destination authority ("…لوزارة التجارة", "to the municipality"),
 *     negated mentions ("مو الموية", "not the water") and purchase channels
 *     ("عبر الإنترنت", "online") are ignored;
 *   - after a correction marker ("قصدي", "I mean") only the corrected part
 *     counts;
 *   - weak words (الشبكة, محل, …) only count when no strong word is present;
 *   - two or more sectors → null: ambiguous, so retrieval and the model decide
 *     (or the user is asked), instead of a silent guess.
 * `mentionsSupportedSector` keeps the broad "does this mention a sector at
 * all" signal the route uses to keep complaints out of the greeting /
 * identity / out-of-scope shortcuts.
 */
/** The single sector-to-entity-name mapping already used elsewhere
 * (lib/complaints/sectors.ts) is entity-name → sector; this is its reverse. */
// Historical spellings map to the same sector; only current official names
// are produced here (lib/government/entity-names.ts).
const SECTOR_TO_ENTITY_NAME = Object.fromEntries(
  Object.entries(ENTITY_NAME_TO_SECTOR)
    .filter(([entityName]) => canonicalEntityName(entityName) === entityName)
    .map(([entityName, sector]) => [sector, entityName]),
) as Record<Sector, string>

const AR = '\\u0600-\\u06FF'
const PREFIX = '(?:[وفبلك])?(?:ال|لل)?'
/** Whole word (with optional prefixes), e.g. "النت", "بالنت" — not "النتيجه". */
const word = (stem: string) => `(?<![${AR}])${PREFIX}${stem}(?![${AR}])`
/** Word start only — the stem may continue ("كهربا" → "الكهربائي"). */
const stem = (s: string) => `(?<![${AR}])${PREFIX}${s}`

type Patterns = { strong: RegExp; weak?: RegExp }
const re = (parts: string[]) => new RegExp(parts.join('|'))

// Written in normalised form (ة→ه, أ/إ/آ→ا, ى→ي).
const ARABIC: Record<Sector, Patterns> = {
  water: { strong: re([stem('مياه'), word('مويه'), '(?:ال)?صرف (?:ال)?صحي', stem('مجاري')]) },
  telecom: {
    strong: re([
      word('نت'),
      stem('انترنت'),
      stem('انترنيت'),
      stem('اتصالات'),
      stem('جوال'),
      word('شريحه'),
      word('باقه'),
      word('الياف'),
      word('فايبر'),
      'واي فاي',
    ]),
    weak: re([word('شبكه'), stem('تغطيه')]),
  },
  commerce: {
    strong: re([
      stem('متجر'),
      stem('متاجر'),
      word('تاجر'),
      word('بائع'),
      word('بايع'),
      word('البايع'),
    ]),
    weak: re([word('محل'), word('المحل')]),
  },
  municipality: {
    strong: re([
      stem('بلديه'),
      stem('بلديات'),
      stem('رصيف'),
      stem('ارصفه'),
      word('حفره'),
      word('حفر'),
      stem('نظافه'),
      stem('قمامه'),
      stem('زباله'),
      stem('نفايات'),
      stem('انقاض'),
      stem('اسفلت'),
      'اعمده الاناره',
      'اناره الشوارع',
      'اناره الشارع',
      'بناء مخالف',
      'ملحق مخالف',
      'مخالفات البناء',
      'مخالفه بناء',
      stem('سادين الطريق'),
      'سد الطريق',
    ]),
    weak: re([word('بلدي'), stem('اناره')]),
  },
  electricity: { strong: re([stem('كهربا'), 'التيار الكهربا']) },
}

const ENGLISH: Record<Sector, Patterns> = {
  water: { strong: /\b(water|sewage|sewer|nwc)\b/i },
  telecom: {
    strong:
      /\b(internet|telecom|mobile network|network coverage|signal|broadband|fiber|fibre|sim card|cst|wi-?fi|mobile data|stc|mobily|zain)\b/i,
  },
  commerce: {
    strong:
      /\b(online store|the store|a store|this store|that store|store (refused|charged|won'?t|didn'?t|never)|shop|merchant|seller|refund|retailer|online order)\b/i,
  },
  municipality: {
    strong:
      /\b(municipality|municipal|potholes?|sidewalks?|pavements?|garbage|rubbish|trash|street ?lights?|balady)\b/i,
  },
  electricity: {
    strong:
      /\b(electricity|electric|power outages?|power cuts?|blackouts?|electricity meter|power (keeps|went|is) (cutting|out|off))\b/i,
  },
}

const ARABIC_CORRECTION = /(?:قصدي|اقصد|بالاصح|المقصود|لا لحظه|لحظه لا)/g
const ENGLISH_CORRECTION = /\b(?:I mean|I meant|actually|no wait|sorry,? I meant)\b/gi

const ARABIC_AUTHORITIES =
  // "هيئة" normalises to "هييه" (ئ→ي).
  '(?:وزاره التجاره|هييه الاتصالات(?: والفضاء والتقنيه)?|(?:ال)?بلديه|(?:ال)?امانه|شركه الكهربا\\S*|(?:ال)?كهربا\\S*|شركه المياه|المياه الوطنيه|شركه الاتصالات)'
/** "…لوزارة التجارة", "إلى هيئة الاتصالات", "هل البلدية مسؤولة عن …". */
const ARABIC_DESTINATION = new RegExp(
  `(?:(?<![${AR}])(?:لل|ل)(?=${ARABIC_AUTHORITIES.replace('(?:', '(?:ال|')})|(?:الي|عند)\\s+)${ARABIC_AUTHORITIES}|(?<=هل\\s)${ARABIC_AUTHORITIES}(?=\\s+(?:مسوول|مسووله|المسووله|المسوول|تختص|مختص|مختصه))`,
  'g',
)
const ENGLISH_DESTINATION =
  /\b(?:to|is|does)\s+(?:the\s+)?(?:municipality|telecom regulator|water company|electricity company|ministry of commerce|cst|nwc)\b/gi
const ARABIC_NEGATED = new RegExp(`(?<![${AR}])(?:مو|مب|موب|مش|ليس|ليست|وليس)\\s+[${AR}]+`, 'g')
const ENGLISH_NEGATED = /\bnot\s+(?:the\s+|my\s+)?\w+/gi
// Purchase channels and purchased goods are not telecom services: "اشتريت
// جوال", "فلوس الجوال" (a phone as a product), "عبر الإنترنت" (bought online),
// and insurance "تغطية" are removed before matching.
const ARABIC_CHANNEL =
  /(?:عبر|من|في)\s+(?:ال)?انترنت|اونلاين|تغطيه\s+(?:ال)?تامين\S*|(?:فلوس|قيمه|سعر|اشتريت|شريت|طلبت|اشتري)\s+(?:ال)?جوال\S*/g
const ENGLISH_CHANNEL =
  /\b(?:online|via the internet|over the internet)\b(?!\s+(?:store|order|shop))/gi

function afterLastCorrection(text: string, marker: RegExp): string {
  const matches = [...text.matchAll(marker)]
  if (matches.length === 0) return text
  const last = matches[matches.length - 1]
  return text.slice((last.index ?? 0) + last[0].length)
}

function matchSectors(arabic: string, english: string): Sector[] {
  const sectors = Object.keys(ARABIC) as Sector[]
  const strong = sectors.filter(
    (s) => ARABIC[s].strong.test(arabic) || ENGLISH[s].strong.test(english),
  )
  if (strong.length > 0) return strong
  return sectors.filter((s) => ARABIC[s].weak?.test(arabic) || ENGLISH[s].weak?.test(english))
}

/** The user corrects themselves ("قصدي…", "I mean…"). */
export function hasCorrectionMarker(message: string): boolean {
  return (
    new RegExp(ARABIC_CORRECTION.source).test(normalizeArabicInput(message)) ||
    new RegExp(ENGLISH_CORRECTION.source, 'i').test(message)
  )
}

/** Every supported sector the message mentions at all (no disambiguation). */
export function mentionsSupportedSector(message: string): boolean {
  return matchSectors(normalizeArabicInput(message), message).length > 0
}

/**
 * Deterministic, keyword-only sector detection — no model call, no RAG, no
 * similarity threshold. Returns the single sector the message's problem is
 * about, or `null` when it names none or more than one (ambiguous).
 */
export function detectSectorByKeyword(message: string): Sector | null {
  let arabic = normalizeArabicInput(message)
  let english = message
  const correctedArabic = afterLastCorrection(arabic, ARABIC_CORRECTION)
  const correctedEnglish = afterLastCorrection(english, ENGLISH_CORRECTION)
  if (correctedArabic !== arabic || correctedEnglish !== english) {
    if (matchSectors(correctedArabic, correctedEnglish).length > 0) {
      arabic = correctedArabic
      english = correctedEnglish
    }
  }
  arabic = arabic
    .replace(ARABIC_DESTINATION, ' ')
    .replace(ARABIC_NEGATED, ' ')
    .replace(ARABIC_CHANNEL, ' ')
  english = english
    .replace(ENGLISH_DESTINATION, ' ')
    .replace(ENGLISH_NEGATED, ' ')
    .replace(ENGLISH_CHANNEL, ' ')
  const sectors = matchSectors(arabic, english)
  return sectors.length === 1 ? sectors[0] : null
}

export function getEntityNameForSector(sector: Sector): string {
  return SECTOR_TO_ENTITY_NAME[sector]
}
