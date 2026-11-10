/**
 * Removes contact details from a model answer that are not verified:
 * a URL, email or phone-like number is kept only when it is in a verified
 * authority profile (any of the five supported authorities), is one of the
 * reference-data official URLs passed in, or was written by the user. This
 * enforces "no unsupported official links / numbers in accepted answers"
 * independently of the prompt.
 */
import { asciiDigits } from '@/lib/complaints/drafting/text'
import { allProfiles, verifiedContacts } from '@/lib/government/profiles'

const URL_RE = /\bhttps?:\/\/[^\s)<>«»"'،]+|\bwww\.[^\s)<>«»"'،]+/gi
const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/gi
/** Saudi-style service numbers: 3–5 digit hotlines, 800/920 numbers, mobiles. */
const PHONE_RE =
  /(?<!\d|\d[.,/])(?:\+?966\s?)?(?:800\s?\d{3}\s?\d{4}|920\s?\d{3}\s?\d{3}|05\d{8}|1\d{3,5}|9\d{2,3})(?!\d|[.,/]\d|\s?%)/g

const ALL = (() => {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const urls: string[] = []
  for (const p of allProfiles()) {
    const c = verifiedContacts(p)
    c.phones.forEach((x) => phones.add(x))
    c.emails.forEach((x) => emails.add(x))
    urls.push(...c.urls)
  }
  return { phones, emails, urls }
})()

const normUrl = (u: string) =>
  u
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/.,;:!?]+$/, '')

/** Only verified pages and official home pages — never an invented sub-path. */
function urlAllowed(u: string, allowed: string[]): boolean {
  const n = normUrl(u)
  return allowed.some((a) => normUrl(a) === n)
}

/** A number counts as a phone only right after a phone word. */
const PHONE_CONTEXT =
  /(?:اتصل\S*|الاتصال|رقم\S*|هاتف\S*|الموحد|الطوارئ|طوارئ|مركز|واتساب|call\w*|phone|dial|number|hotline|helpline|emergency|contact)/i

export type ScrubResult = { text: string; removed: string[] }

export function scrubUnverifiedContacts(
  answer: string,
  options: { officialUrls?: (string | null | undefined)[]; userText?: string },
): ScrubResult {
  const removed: string[] = []
  const user = asciiDigits(options.userText ?? '')
  const allowedUrls = [
    ...ALL.urls,
    ...(options.officialUrls ?? []).filter((u): u is string => Boolean(u)),
  ]
  let text = answer.replace(URL_RE, (u) => {
    if (urlAllowed(u, allowedUrls) || user.includes(u)) return u
    removed.push(u)
    return ''
  })
  text = text.replace(EMAIL_RE, (e) => {
    if (ALL.emails.has(e.toLowerCase()) || user.includes(e)) return e
    removed.push(e)
    return ''
  })
  text = asciiDigits(text).replace(PHONE_RE, (m, offset: number, whole: string) => {
    // A phone word earlier in the same sentence (amounts elsewhere are untouched).
    const before = whole.slice(Math.max(0, offset - 60), offset)
    const sentence = before.slice(
      Math.max(...['.', '\n', '!', '?', '؟', '؛'].map((c) => before.lastIndexOf(c))) + 1,
    )
    if (!PHONE_CONTEXT.test(sentence)) return m
    const digits = m.replace(/\D/g, '').replace(/^966/, '0')
    if (
      ALL.phones.has(digits) ||
      ALL.phones.has(m.trim()) ||
      user.replace(/\D/g, ' ').split(' ').includes(digits)
    )
      return m
    removed.push(m.trim())
    return ''
  })
  if (removed.length === 0) return { text: answer, removed }
  return {
    text: text
      .replace(/\(\s*\)|«\s*»|:\s*(?=\n|$)/g, '')
      .replace(/\s+(?:أو|او|or|and|و)\s*(?=[.،,؛]|$)/gm, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +([،,.])/g, '$1')
      .trim(),
    removed,
  }
}
