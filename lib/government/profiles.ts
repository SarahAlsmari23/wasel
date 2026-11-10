/**
 * Verified government authority profiles (data/government/authorities.json).
 *
 * The reviewed JSON file is the single source of truth for official channels,
 * procedures and published service times: every fact carries the official
 * page it was read on and a verbatim quote. It is used by
 *  - the authority card (only verified, relevant fields are shown),
 *  - the chat prompt (deterministic grounding once an authority is selected,
 *    independent of vector retrieval), and
 *  - the answer check that removes phone numbers / links not in the profile.
 * Facts listed under `notPublished` are never stated.
 */
import data from '@/data/government/authorities.json'

export type Localized = { ar: string; en: string }
type LocalizedList = { ar: string[]; en: string[] }

export type ProfileSource = {
  id: string
  authority: string
  url: string
  title: string
  language: string
  pageUpdated: string | null
  status: 'verified' | 'unverified'
  note?: string
}
export type ProfileChannel = {
  kind: 'phone' | 'url' | 'email' | 'app' | 'channel'
  value: string
  label: Localized
  source: string
  quote: string
}
export type ProfileProcedure = {
  topic: string
  title: Localized
  steps: LocalizedList
  prerequisites?: LocalizedList
  conditions?: LocalizedList
  documents?: LocalizedList
  requirements?: LocalizedList
  fee?: Localized
  serviceTime?: Localized
  publishedTimes?: Localized
  tip?: Localized
  source: string
  quote: string
}
export type ServiceLevel = {
  item: Localized
  value: Localized
  compensation: Localized
  source: string
  quote: string
}
export type AuthorityProfile = {
  code: string
  dbName: string
  officialNameAr: { value: string; source: string; quote: string }
  officialNameEn: { value: string; source: string; quote: string } | null
  website: string
  scope?: Localized & { source: string; quote: string }
  channels: ProfileChannel[]
  procedures: ProfileProcedure[]
  serviceLevels?: ServiceLevel[]
  notPublished: string[]
}

type RawData = {
  verifiedAt: string
  sources: ProfileSource[]
  authorities: Record<string, Omit<AuthorityProfile, 'code'>>
}
const RAW = data as unknown as RawData

export const PROFILES_VERIFIED_AT = RAW.verifiedAt

const BY_DB_NAME = new Map<string, AuthorityProfile>(
  Object.entries(RAW.authorities).map(([code, p]) => [p.dbName, { code, ...p }]),
)
const SOURCES = new Map(RAW.sources.map((s) => [s.id, s]))

export function getAuthorityProfile(
  entityName: string | null | undefined,
): AuthorityProfile | null {
  return entityName ? (BY_DB_NAME.get(entityName) ?? null) : null
}

export function getProfileSource(id: string): ProfileSource | null {
  const s = SOURCES.get(id)
  return s && s.status === 'verified' ? s : null
}

export function allProfiles(): AuthorityProfile[] {
  return [...BY_DB_NAME.values()]
}

const TOPIC_HINTS: { topic: string; pattern: RegExp }[] = [
  { topic: 'high_bill', pattern: /فاتور|bill|مبلغ|charge/i },
  { topic: 'meter_fault', pattern: /عداد|meter/i },
  { topic: 'water_incident_report', pattern: /طفح|تسرب|تسريب|مجاري|صرف|leak|overflow|sewage/i },
  { topic: 'provider_did_not_open_ticket', pattern: /تذكر|ticket|ما فتحوا|لم يفتح/i },
]

/** The procedures relevant to a message (all when nothing more specific matches). */
export function relevantProcedures(profile: AuthorityProfile, message: string): ProfileProcedure[] {
  const hinted = TOPIC_HINTS.filter((h) => h.pattern.test(message)).map((h) => h.topic)
  const matches = profile.procedures.filter((p) => hinted.includes(p.topic))
  return matches.length > 0 ? matches : profile.procedures
}

/** The authority's primary complaint procedure (for the card). */
export function primaryProcedure(profile: AuthorityProfile): ProfileProcedure | null {
  return profile.procedures[0] ?? null
}

/**
 * A compact, deterministic grounding block for the chat prompt: verified
 * channels, the relevant procedure(s) and published service levels, each
 * with its source URL. Arabic labels, plus the locale's text when English.
 */
export function profilePromptBlock(
  profile: AuthorityProfile,
  message: string,
  locale: 'ar' | 'en',
): string {
  const L = (x: Localized) => (locale === 'en' ? x.en : x.ar)
  const LL = (x: LocalizedList | undefined) => (x ? (locale === 'en' ? x.en : x.ar) : [])
  const url = (id: string) => SOURCES.get(id)?.url ?? ''
  const lines: string[] = [
    `معلومات رسمية موثّقة عن ${profile.dbName} (تم التحقق منها في ${RAW.verifiedAt} من المواقع الرسمية؛ يجوز ذكرها كما هي مع رابط مصدرها، ولا يجوز ذكر غيرها):`,
  ]
  if (profile.scope)
    lines.push(`الاختصاص (المصدر: ${url(profile.scope.source)}): ${L(profile.scope)}`)
  lines.push(`الموقع الرسمي: ${profile.website}`)
  lines.push('قنوات التواصل والتقديم:')
  for (const c of profile.channels)
    lines.push(`- ${L(c.label)}: ${c.value} (المصدر: ${url(c.source)})`)
  for (const p of relevantProcedures(profile, message)) {
    lines.push(`${L(p.title)} (المصدر: ${url(p.source)}):`)
    for (const x of LL(p.prerequisites)) lines.push(`- شرط: ${x}`)
    for (const x of LL(p.conditions)) lines.push(`- شرط: ${x}`)
    LL(p.steps).forEach((s, i) => lines.push(`${i + 1}. ${s}`))
    for (const x of LL(p.documents)) lines.push(`- مستند: ${x}`)
    for (const x of LL(p.requirements)) lines.push(`- متطلب: ${x}`)
    if (p.serviceTime) lines.push(`- المدة المنشورة: ${L(p.serviceTime)}`)
    if (p.publishedTimes) lines.push(`- المدد المنشورة: ${L(p.publishedTimes)}`)
    if (p.fee) lines.push(`- الرسوم: ${L(p.fee)}`)
  }
  if (
    profile.serviceLevels?.length &&
    /انقطاع|انقطع|مقطوع|طاف|طفت|فاتور|تعويض|outage|cut|bill|compensat/i.test(message)
  ) {
    lines.push(`مستويات الخدمة المنشورة (المصدر: ${url(profile.serviceLevels[0].source)}):`)
    for (const s of profile.serviceLevels)
      lines.push(`- ${L(s.item)}: ${L(s.value)}؛ التعويض المنشور: ${L(s.compensation)}`)
  }
  lines.push(
    `غير منشور في المصادر الرسمية التي تمت مراجعتها (لا تذكره ولا تخمّنه): ${profile.notPublished.join('، ')}`,
  )
  return lines.join('\n')
}

/** Phone numbers, emails and URLs that are verified for this profile. */
export function verifiedContacts(profile: AuthorityProfile | null): {
  phones: Set<string>
  urls: string[]
  emails: Set<string>
} {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const urls: string[] = []
  if (profile) {
    urls.push(profile.website)
    for (const c of profile.channels) {
      if (c.kind === 'phone') phones.add(c.value)
      if (c.kind === 'email') emails.add(c.value.toLowerCase())
      if (c.kind === 'url') urls.push(c.value)
    }
    for (const id of new Set([
      ...profile.channels.map((c) => c.source),
      ...profile.procedures.map((p) => p.source),
    ])) {
      const s = getProfileSource(id)
      if (s) urls.push(s.url)
    }
  }
  return { phones, urls, emails }
}
