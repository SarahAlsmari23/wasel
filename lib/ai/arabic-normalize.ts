/**
 * Phase 7.2B — reusable Arabic text normalization + controlled fuzzy matching.
 *
 * This module is a pure classification aid: every function here is used only
 * to decide *which deterministic intent guard fires* (identity / out-of-scope
 * / explicit complaint creation / side question). Nothing here ever touches
 * the raw user message that gets displayed, stored, or saved as a complaint
 * field value — callers always keep the original string for persistence and
 * only ever pass a normalized *copy* into the matching functions below.
 */

// Arabic combining marks (fatha/damma/kasra/tanween/sukun/shadda + the
// superscript alef) plus tatweel (ـ), the elongation character.
const DIACRITICS_AND_TATWEEL_PATTERN = /[ً-ْٰـ]/g

const PUNCTUATION_PATTERN = /[؟?!،,.:؛]/g

/** Collapses a run of 3+ identical *Arabic-range* characters to one — never
 * touches digits or Latin letters, so reference numbers ("11112222") and
 * provider codes ("STC") are never affected. Two-in-a-row is left alone
 * (e.g. a genuine doubled letter), only 3+ counts as "exaggerated". */
function collapseRepeatedChars(text: string): string {
  return text.replace(/([؀-ۿ])\1{2,}/g, '$1')
}

/**
 * Normalizes Arabic text for intent classification only. Not reversible, not
 * meant for display or storage — see the module docstring.
 */
export function normalizeArabicInput(text: string): string {
  let out = text

  // 1. Letter variants that speakers use interchangeably when typing fast.
  out = out.replace(/[أإآٱ]/g, 'ا')
  out = out.replace(/ى/g, 'ي')
  out = out.replace(/ؤ/g, 'و')
  out = out.replace(/ئ/g, 'ي')
  out = out.replace(/ة/g, 'ه')

  // 2. Diacritics + tatweel carry no meaning for intent matching.
  out = out.replace(DIACRITICS_AND_TATWEEL_PATTERN, '')

  // 3. Exaggerated repeated letters ("مييييين" → "مين").
  out = collapseRepeatedChars(out)

  // 4. Punctuation must not affect intent detection — drop it entirely
  // (replaced with a space so "شكرا؟وش" doesn't glue into one token).
  out = out.replace(PUNCTUATION_PATTERN, ' ')

  // 5. Whitespace normalization.
  out = out
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return out
}

/** Standard Levenshtein edit distance (insert/delete/substitute), bounded to
 * short strings only (see isFuzzyPhraseMatch's word-count gate) — this is
 * never run against a full sentence. */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j += 1) prev[j] = j

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

const MAX_FUZZY_WORDS = 4

/**
 * Controlled fuzzy match: is `normalizedInput` a small typo away from one of
 * `canonicalPhrases` (already-normalized short reference phrases)?
 *
 * Deliberately conservative:
 * - never applied to more than MAX_FUZZY_WORDS words, so a long sentence that
 *   merely contains a short trigger word (e.g. "مين الجهة المختصة بشكوى
 *   المياه") is never pulled in just because it starts similarly;
 * - the allowed edit distance scales with the canonical phrase's own length
 *   and is capped at 2, so very short unrelated words ("لا", "نعم", "زين")
 *   are never within range of a 6-8 character phrase like "مين انت";
 * - the length difference between input and phrase must itself stay within
 *   the same bound, so a much longer/shorter string never matches solely on
 *   distance.
 */
export function isFuzzyPhraseMatch(normalizedInput: string, canonicalPhrases: string[]): boolean {
  const trimmed = normalizedInput.trim()
  if (trimmed === '') return false
  if (trimmed.split(' ').filter(Boolean).length > MAX_FUZZY_WORDS) return false

  return canonicalPhrases.some((phrase) => {
    const maxDistance = Math.min(2, Math.max(1, Math.ceil(phrase.length / 4)))
    if (Math.abs(trimmed.length - phrase.length) > maxDistance) return false
    return levenshteinDistance(trimmed, phrase) <= maxDistance
  })
}

/** Splits an already-normalized string into non-empty whitespace tokens. */
export function tokenizeNormalized(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean)
}

/** Is `needle` a subsequence of `haystack` — every character of `needle`
 * appears in `haystack`, in the same order (not necessarily contiguous)? */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0
  for (const ch of haystack) {
    if (i < needle.length && ch === needle[i]) i += 1
  }
  return i === needle.length
}

/**
 * Small, bounded per-token typo tolerance ("ممين"/"معيين"/"مييين" ~ "مين").
 *
 * Plain edit distance alone is not safe here: real, unrelated short Arabic
 * words routinely sit within distance 1-2 of a 3-4 letter synonym purely by
 * chance (measured false positives during calibration: "ممكن" ~ "مين"/"من",
 * "رسوم" ~ "تسوي", "زين" ~ "مين" — all distance ≤2). What actually
 * distinguishes a genuine typo of a synonym from an unrelated word that
 * happens to be nearby in edit distance is that a typo *inserts* extra
 * characters into (or drops one from) the synonym while leaving its letters
 * in the same order — so the synonym's letters must appear, in order, as a
 * subsequence of the token. "معيين" contains م…ي…ن in order (matches
 * "مين"); "ممكن" does not contain "ي" at all (rejected) even though its raw
 * edit distance to "مين" is the same.
 *
 * Very short synonyms (≤2 letters: "من", "ما", "وش") are exempted from even
 * that — two letters are too easy to find in-order inside an unrelated
 * 4+ letter word — so those only tolerate a single extra/wrong character
 * ("وشش" → "وش"), never a 2-edit gap.
 *
 * This alone is still not a safe intent signal on its own — callers must
 * always pair it with a second, semantically-independent token group (see
 * hasTokenFromGroup / Phase 7.3 Part 5 — "never classify from a single
 * word/group alone").
 */
function isTokenFuzzyMatch(token: string, synonym: string): boolean {
  if (token === synonym) return true

  if (synonym.length <= 2) {
    if (Math.abs(token.length - synonym.length) > 1) return false
    return levenshteinDistance(token, synonym) <= 1
  }

  const maxDistance = 2
  if (Math.abs(token.length - synonym.length) > maxDistance) return false
  if (levenshteinDistance(token, synonym) > maxDistance) return false
  return isSubsequence(synonym, token)
}

/**
 * True when at least one token in `tokens` matches one of `synonyms` —
 * exactly, or (when `allowFuzzy`) within the small bounded typo tolerance
 * above. Fuzzy tolerance is only ever enabled by callers for short messages
 * (few tokens total), so a long, unrelated sentence can't rack up a
 * coincidental fuzzy hit purely by having many words to try against.
 */
export function hasTokenFromGroup(
  tokens: string[],
  synonyms: string[],
  allowFuzzy: boolean,
): boolean {
  return tokens.some((token) =>
    synonyms.some((synonym) =>
      allowFuzzy ? isTokenFuzzyMatch(token, synonym) : token === synonym,
    ),
  )
}
