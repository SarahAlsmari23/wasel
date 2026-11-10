/**
 * Structured, user-grounded complaint facts.
 *
 * Two layers:
 *  1. Deterministic facts (no model): amounts, explicit dates, reference
 *     numbers and the complaint's collected fields, each with the source it
 *     came from. Exact values in the letter are checked against these.
 *  2. Model-extracted facts (the story: what happened, prior contact, the
 *     requested resolution, evidence the user says they have, corrections),
 *     accepted only when their `quote` is found in the cited user message or
 *     field — `groundFacts` drops everything else. Assistant messages are never
 *     a source: only the user's own messages and fields are numbered.
 */
import { isFieldValueUsable } from '@/lib/ai/missing-fields'
import { parseBooleanAnswer } from '@/lib/ai/intent-guards'
import type { Sector } from '@/lib/complaints/sectors'
import {
  cleanSpaces,
  extractAmounts,
  extractDates,
  extractNumbers,
  extractReferences,
  isTrivialMessage,
  norm,
  isSuperseded,
  supersededValues,
  type AmountFact,
} from '@/lib/complaints/drafting/text'

export type FactSource = { kind: 'message'; index: number } | { kind: 'field'; key: string }
/** One numbered thing the user said (a chat message or a complaint field). */
export type SourceEntry = { id: number; source: FactSource; label?: string; text: string }

export type GroundedFact = { text: string; quote: string; sourceId: number }

export type PriorContact = {
  status: 'yes' | 'no' | 'unknown'
  /** Never a number unless the user wrote that number. */
  attempts: 'once' | 'multiple' | 'unknown' | number
  quote: string
  sourceId: number | null
  response: GroundedFact | null
}

export type Correction = { original: string; corrected: string; sourceId: number }

export type ComplaintFacts = {
  schemaVersion: 1
  sector: Sector | null
  problem: GroundedFact | null
  events: GroundedFact[]
  priorContact: PriorContact
  resolution: GroundedFact | null
  evidence: GroundedFact[]
  locations: GroundedFact[]
  corrections: Correction[]
  /** Deterministic (no model). */
  amounts: (AmountFact & { sourceId: number; superseded: boolean })[]
  dates: { text: string; sourceId: number }[]
  references: { text: string; sourceId: number }[]
  fields: Record<string, string>
  missing: ('date' | 'amount' | 'resolution' | 'prior_contact')[]
  uncertain: string[]
  /** Model facts rejected because their quote was not in the user's words. */
  rejected: number
  /** Hash of the sources the facts were extracted from (reuse check). */
  fingerprint?: string
}

/** Stable, non-cryptographic hash of the numbered sources (FNV-1a). */
export function sourcesFingerprint(sources: SourceEntry[]): string {
  let hash = 0x811c9dc5
  for (const ch of sources.map((s) => `${s.id}|${s.text}`).join('\n')) {
    hash ^= ch.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16)
}

const SENSITIVE_KEY = /national[_-]?id|password|token|secret|card|bank|iban/i
const MAX_MESSAGES = 14
const MAX_MESSAGE_CHARS = 700
const MAX_TOTAL_CHARS = 5000

/** Numbers every non-trivial user message (oldest first, newest kept when the
 * budget runs out) and every non-sensitive collected field. */
export function buildSources(
  userMessages: string[],
  fields: Record<string, string>,
  fieldLabels: Record<string, string>,
): SourceEntry[] {
  const messages = userMessages
    .map((text, index) => ({ index, text: cleanSpaces(text).slice(0, MAX_MESSAGE_CHARS) }))
    .filter((m) => m.text !== '' && !isTrivialMessage(m.text))
  let kept = messages.slice(-MAX_MESSAGES)
  while (kept.length > 1 && kept.reduce((n, m) => n + m.text.length, 0) > MAX_TOTAL_CHARS) {
    kept = kept.slice(1)
  }
  const entries: SourceEntry[] = kept.map((m, i) => ({
    id: i + 1,
    source: { kind: 'message', index: m.index },
    text: m.text,
  }))
  for (const [key, raw] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) continue
    const text = cleanSpaces(raw ?? '').slice(0, MAX_MESSAGE_CHARS)
    if (!text) continue
    // The description is usually a copy of a message already numbered.
    if (key === 'problem_description' && entries.some((e) => norm(e.text) === norm(text))) continue
    entries.push({
      id: entries.length + 1,
      source: { kind: 'field', key },
      label: fieldLabels[key] ?? key,
      text,
    })
  }
  return entries
}

export function corpusOf(sources: SourceEntry[]): string {
  return sources.map((s) => s.text).join('\n')
}

function findSource(sources: SourceEntry[], quote: string, preferredId: number): number | null {
  const q = norm(quote)
  if (q.length < 2) return null
  const preferred = sources.find((s) => s.id === preferredId)
  if (preferred && norm(preferred.text).includes(q)) return preferred.id
  return sources.find((s) => norm(s.text).includes(q))?.id ?? null
}

type RawFact = { text?: unknown; quote?: unknown; source?: unknown }

function str(value: unknown, max = 400): string {
  return typeof value === 'string' ? cleanSpaces(value).slice(0, max) : ''
}
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0
}

function groundOne(raw: unknown, sources: SourceEntry[]): GroundedFact | null | 'rejected' {
  if (!raw || typeof raw !== 'object') return null
  const fact = raw as RawFact
  const text = str(fact.text)
  const quote = str(fact.quote, 300)
  if (!text) return null
  const sourceId = findSource(sources, quote, num(fact.source))
  return sourceId === null ? 'rejected' : { text, quote, sourceId }
}

function groundList(raw: unknown, sources: SourceEntry[], max: number) {
  const out: GroundedFact[] = []
  let rejected = 0
  for (const item of Array.isArray(raw) ? raw.slice(0, max) : []) {
    const fact = groundOne(item, sources)
    if (fact === 'rejected') rejected++
    else if (fact) out.push(fact)
  }
  return { out, rejected }
}

const MULTIPLE =
  /(?:اكثر من مره|كذا مره|عده مرات|مرات|مرارا|كثير|اكثر من|several|multiple|many|a bunch|more than once|again and again|times)/
const ONCE = /(?:مره وحده|مره واحده|مره|once|one time)/
const NUMBER_WORDS: Record<string, number> = {
  مرتين: 2,
  ثلاث: 3,
  ثلاثه: 3,
  اربع: 4,
  اربعه: 4,
  خمس: 5,
  خمسه: 5,
  twice: 2,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
}

/** The attempt count, never more specific than the user's own words. */
function groundAttempts(claimed: unknown, quote: string): PriorContact['attempts'] {
  const q = norm(quote)
  const digits = extractNumbers(q).map(Number)
  if (typeof claimed === 'number' || /^\d+$/.test(String(claimed))) {
    const n = Number(claimed)
    if (digits.includes(n)) return n
    const word = Object.entries(NUMBER_WORDS).find(([w, v]) => v === n && q.includes(w))
    if (word) return n
  }
  if (MULTIPLE.test(q)) return 'multiple'
  if (claimed === 'once' && ONCE.test(q)) return 'once'
  return 'unknown'
}

/**
 * Validates the model's raw extraction against the user's own words and
 * merges it with the deterministic facts. Never throws: malformed parts are
 * dropped, so the worst case is fewer facts, never invented ones.
 */
export function groundFacts(
  raw: unknown,
  sources: SourceEntry[],
  sector: Sector | null,
): ComplaintFacts {
  const facts = deterministicFacts(sources, sector)
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  let rejected = 0

  const problem = groundOne(obj.problem, sources)
  if (problem === 'rejected') rejected++
  else facts.problem = problem

  for (const [key, max] of [
    ['events', 8],
    ['evidence', 4],
    ['locations', 3],
  ] as const) {
    const { out, rejected: r } = groundList(obj[key], sources, max)
    facts[key] = out
    rejected += r
  }

  const resolution = groundOne(obj.resolution, sources)
  if (resolution === 'rejected') rejected++
  else facts.resolution = resolution

  const contact = (obj.contact ?? {}) as Record<string, unknown>
  const status = contact.status === 'yes' || contact.status === 'no' ? contact.status : 'unknown'
  const contactQuote = str(contact.quote, 300)
  const contactSource =
    status === 'unknown' ? null : findSource(sources, contactQuote, num(contact.source))
  if (status !== 'unknown' && contactSource === null) rejected++
  // A collected yes/no field is authoritative over the model's reading.
  const fieldContact = facts.priorContact
  if (fieldContact.status === 'unknown' && contactSource !== null) {
    const response = groundOne(contact.response, sources)
    if (response === 'rejected') rejected++
    facts.priorContact = {
      status,
      attempts: status === 'yes' ? groundAttempts(contact.attempts, contactQuote) : 'unknown',
      quote: contactQuote,
      sourceId: contactSource,
      response: response && response !== 'rejected' ? response : null,
    }
  } else if (
    fieldContact.status !== 'unknown' &&
    contactSource !== null &&
    status === fieldContact.status
  ) {
    const response = groundOne(contact.response, sources)
    facts.priorContact.attempts =
      status === 'yes' ? groundAttempts(contact.attempts, contactQuote) : 'unknown'
    if (response && response !== 'rejected') facts.priorContact.response = response
  }

  for (const item of Array.isArray(obj.corrections) ? obj.corrections.slice(0, 4) : []) {
    const c = item as Record<string, unknown>
    const original = str(c.original, 200)
    const corrected = str(c.corrected, 200)
    const sourceId = findSource(sources, corrected, num(c.source))
    if (!original || !corrected || sourceId === null) continue
    // The original must also be something the user said earlier.
    if (findSource(sources, original, 0) === null) continue
    facts.corrections.push({ original, corrected, sourceId })
  }
  // A corrected amount supersedes the original one.
  for (const correction of facts.corrections) {
    const before = extractNumbers(correction.original)
    const after = new Set(extractNumbers(correction.corrected))
    for (const amount of facts.amounts) {
      if (before.includes(amount.value) && !after.has(amount.value)) amount.superseded = true
    }
  }

  facts.uncertain = (Array.isArray(obj.uncertain) ? obj.uncertain : [])
    .map((u) => str(u, 160))
    .filter(Boolean)
    .slice(0, 5)
  facts.rejected = rejected
  facts.missing = missingInformation(facts)
  return facts
}

/** Facts derived without any model call — the fallback's only input. */
export function deterministicFacts(sources: SourceEntry[], sector: Sector | null): ComplaintFacts {
  const amounts: ComplaintFacts['amounts'] = []
  const dates: ComplaintFacts['dates'] = []
  const references: ComplaintFacts['references'] = []
  const fields: Record<string, string> = {}
  for (const s of sources) {
    for (const a of extractAmounts(s.text)) {
      if (!amounts.some((x) => x.value === a.value))
        amounts.push({ ...a, sourceId: s.id, superseded: false })
    }
    for (const d of extractDates(s.text)) {
      if (!dates.some((x) => x.text === d)) dates.push({ text: d, sourceId: s.id })
    }
    for (const r of extractReferences(s.text)) {
      if (!references.some((x) => x.text === r) && !amounts.some((a) => a.value === r)) {
        references.push({ text: r, sourceId: s.id })
      }
    }
    if (s.source.kind === 'field') fields[s.source.key] = s.text
  }
  // Explicit corrections ("لا قصدي 950 مو 900") supersede earlier values,
  // even before (or without) the model's own reading of the corrections.
  const superseded = supersededValues(sources.map((s) => s.text).join('\n'))
  for (const amount of amounts) if (superseded.has(amount.value)) amount.superseded = true
  for (let i = dates.length - 1; i >= 0; i--) {
    if (isSuperseded(dates[i].text, superseded)) dates.splice(i, 1)
  }
  for (let i = references.length - 1; i >= 0; i--) {
    if (superseded.has(references[i].text)) references.splice(i, 1)
  }
  const contactField = fields.prior_provider_contact
  const contactSource = sources.find(
    (s) => s.source.kind === 'field' && s.source.key === 'prior_provider_contact',
  )
  let priorContact: PriorContact = {
    status: 'unknown',
    attempts: 'unknown',
    quote: '',
    sourceId: null,
    response: null,
  }
  if (contactField && contactSource && isFieldValueUsable('prior_provider_contact', contactField)) {
    const firstWord = contactField.split(/[\s،,.:؛-]+/)[0] ?? ''
    const parsed = parseBooleanAnswer(contactField) ?? parseBooleanAnswer(firstWord)
    if (parsed !== null) {
      priorContact = {
        status: parsed ? 'yes' : 'no',
        attempts: parsed ? groundAttempts(null, contactField) : 'unknown',
        quote: contactField,
        sourceId: contactSource.id,
        response: null,
      }
    }
  }
  const facts: ComplaintFacts = {
    schemaVersion: 1,
    sector,
    problem: null,
    events: [],
    priorContact,
    resolution: null,
    evidence: [],
    locations: [],
    corrections: [],
    amounts,
    dates,
    references,
    fields,
    missing: [],
    uncertain: [],
    rejected: 0,
  }
  facts.missing = missingInformation(facts)
  return facts
}

const BILL_SECTORS = new Set<Sector>(['water', 'electricity', 'telecom'])

function missingInformation(facts: ComplaintFacts): ComplaintFacts['missing'] {
  const missing: ComplaintFacts['missing'] = []
  if (facts.dates.length === 0) missing.push('date')
  const corpus = norm(Object.values(facts.fields).join(' ') + ' ' + (facts.problem?.quote ?? ''))
  if (
    facts.amounts.length === 0 &&
    facts.sector &&
    (BILL_SECTORS.has(facts.sector) || facts.sector === 'commerce') &&
    /فاتور|مبلغ|سعر|خصم|bill|charge|price|refund|استرداد|استرجاع/.test(corpus)
  ) {
    missing.push('amount')
  }
  if (!facts.resolution) missing.push('resolution')
  if (facts.priorContact.status === 'unknown') missing.push('prior_contact')
  return missing
}

/** A compact, model-facing view: no names, no internal ids beyond source numbers. */
export function factsForDrafting(facts: ComplaintFacts) {
  const live = facts.amounts.filter((a) => !a.superseded)
  return {
    problem: facts.problem?.text ?? null,
    problem_user_words: facts.problem?.quote ?? null,
    events: facts.events.map((e) => e.text),
    prior_contact:
      facts.priorContact.status === 'unknown'
        ? null
        : {
            contacted: facts.priorContact.status === 'yes',
            attempts: facts.priorContact.attempts,
            user_words: facts.priorContact.quote,
            response_received: facts.priorContact.response?.text ?? null,
          },
    requested_resolution: facts.resolution?.text ?? null,
    evidence_user_says_they_have: facts.evidence.map((e) => e.text),
    locations: [
      ...facts.locations.map((l) => l.text),
      ...(facts.fields.city ? [facts.fields.city] : []),
      ...(facts.fields.location_or_address ? [facts.fields.location_or_address] : []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    amounts: live.map((a) => (a.currency ? `${a.value} SAR` : a.value)),
    superseded_values_do_not_use: [
      ...facts.amounts.filter((a) => a.superseded).map((a) => a.value),
      ...facts.corrections.map((c) => c.original),
    ],
    dates: facts.dates.map((d) => d.text),
    references: facts.references.map((r) => r.text),
    service_provider_or_merchant:
      facts.fields.service_provider || facts.fields.merchant_name || null,
    account_or_meter_number: facts.fields.account_or_meter_number || null,
  }
}
