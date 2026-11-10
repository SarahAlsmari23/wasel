/**
 * LLM-assisted complaint drafting:
 *
 *   user messages + collected fields
 *     → numbered sources (user text only, never assistant text)
 *     → fact extraction (Llama 4 Scout, JSON schema) → grounding (quotes must
 *       exist in the cited user entry) + deterministic amounts/dates/refs
 *     → drafting (Llama 4 Scout, facts only — no name, no raw transcript)
 *     → independent deterministic validation (validate.ts)
 *     → at most one bounded correction call → re-validation
 *     → otherwise the deterministic builder (formal-letter*.ts)
 *
 * The server, not the model, writes the letter frame: recipient (verified
 * official name), greeting, reference fields, closing and the user's name.
 * Disabled unless AI_COMPLAINT_DRAFTING=enabled (see isAiDraftingEnabled):
 * production keeps the deterministic builder until data residency for the
 * inference provider is approved.
 */
import { runLlamaJson, type LlamaJsonResult } from '@/lib/ai/cloudflare'
import { ENGLISH_FIELD_LABELS } from '@/lib/ai/server-copy'
import {
  buildFormalComplaintLetter,
  COMPLAINT_FIELD_LABELS,
  type BuildFormalLetterInput,
  type FormalLetterResult,
} from '@/lib/complaints/formal-letter'
import { buildEnglishFormalComplaintLetter } from '@/lib/complaints/formal-letter-en'
import { ENTITY_NAME_TO_SECTOR } from '@/lib/complaints/sectors'
import { entityDisplayName } from '@/lib/mock/government-entities'
import {
  buildSources,
  corpusOf,
  factsForDrafting,
  groundFacts,
  sourcesFingerprint,
  type ComplaintFacts,
} from '@/lib/complaints/drafting/facts'
import {
  correctionUserPrompt,
  DRAFT_SCHEMA,
  draftSystemPrompt,
  draftUserPrompt,
  EXTRACTION_SCHEMA,
  EXTRACTION_SYSTEM,
  extractionUserPrompt,
  type DraftStyle,
} from '@/lib/complaints/drafting/prompts'
import { validateDraft, type ValidationIssue } from '@/lib/complaints/drafting/validate'
import { cleanSpaces } from '@/lib/complaints/drafting/text'

export type DraftingPath = 'ai' | 'ai_corrected' | 'fallback' | 'rules'

export type DraftingMeta = {
  path: DraftingPath
  model: string | null
  /** Why the fallback was used (internal; never shown to the user verbatim). */
  fallbackReason: 'extraction_failed' | 'draft_failed' | 'validation_failed' | 'timeout' | null
  /** Validation issue codes of the rejected draft(s). */
  rejectedIssues: string[]
  calls: number
  ms: { extract: number; draft: number; correct: number; total: number }
  tokens: { prompt: number; completion: number }
  /** Workers AI neurons, from Cloudflare's published Llama 4 Scout rates. */
  neurons: number
  factsReused: boolean
}

/** Llama 4 Scout on Workers AI: neurons per token (developers.cloudflare.com/workers-ai/platform/pricing). */
const NEURONS_PER_INPUT_TOKEN = 24_545 / 1_000_000
const NEURONS_PER_OUTPUT_TOKEN = 77_273 / 1_000_000

const TOTAL_BUDGET_MS = 32_000
const EXTRACT_TIMEOUT_MS = 13_000
const DRAFT_TIMEOUT_MS = 16_000
/** A correction is only attempted when at least this much time remains. */
const MIN_CORRECTION_MS = 9_000

export function isAiDraftingEnabled(): boolean {
  return process.env.AI_COMPLAINT_DRAFTING?.trim().toLowerCase() === 'enabled'
}

export const DRAFT_STYLES: readonly DraftStyle[] = ['standard', 'shorter', 'more_formal']
export function parseDraftStyle(value: unknown): DraftStyle {
  return DRAFT_STYLES.includes(value as DraftStyle) ? (value as DraftStyle) : 'standard'
}

export type DraftInput = BuildFormalLetterInput & {
  locale: 'ar' | 'en'
  style?: DraftStyle
  /** Facts stored with the previous version, reused when the case is unchanged. */
  previousFacts?: unknown
}

export type DraftResult = {
  letter: FormalLetterResult
  facts: ComplaintFacts | null
  meta: DraftingMeta
  /** Validation outcome of the letter that was returned (AI paths only). */
  issues: ValidationIssue[]
}

type LlamaCaller = typeof runLlamaJson

export function buildRulesLetter(input: DraftInput): FormalLetterResult {
  if (input.locale === 'en') return buildEnglishFormalComplaintLetter(input)
  const letter = buildFormalComplaintLetter(input)
  return { ...letter, generatedFromData: { language: 'ar', ...letter.generatedFromData } }
}

function isStoredFacts(value: unknown): value is ComplaintFacts {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as ComplaintFacts).schemaVersion === 1 &&
    Array.isArray((value as ComplaintFacts).amounts)
  )
}

const FRAME_LINE =
  /^(?:السلام عليكم.*|الموضوع\s*:.*|إلى\s*:.*|وتفضلوا.*|مع (?:خالص )?(?:التحية|الشكر).*|الاسم\s*:.*|dear .*|subject\s*:.*|to\s*:.*|yours (?:faithfully|sincerely).*|(?:best|kind) regards.*|sincerely.*)$/i

/** Strips a frame the model added anyway, markdown, and bullet markers. */
export function cleanModelBody(body: string): string {
  return body
    .replace(/\r/g, '')
    .replace(/\*\*|__|^#+\s*/gm, '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter((line) => !FRAME_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseDraft(json: unknown): { subject: string; body: string } | null {
  if (!json || typeof json !== 'object') return null
  const { subject, body } = json as Record<string, unknown>
  if (typeof subject !== 'string' || typeof body !== 'string') return null
  const cleanSubject = cleanSpaces(subject.replace(/^(?:الموضوع|subject)\s*:\s*/i, '')).replace(
    /[.。]$/,
    '',
  )
  return { subject: cleanSubject, body: cleanModelBody(body) }
}

const ISSUE_EXPLANATION: Record<string, string> = {
  'fabricated-number': 'contains a number the user never gave',
  'fabricated-count': 'states a number of times the user never gave',
  'superseded-value': 'contains a value the user later corrected',
  'missing-amount': 'omits an amount from the facts',
  'missing-date': 'omits a date from the facts',
  'missing-reference': 'omits a reference number from the facts',
  'unverified-authority-name': 'names an organisation other than the recipient as written',
  'fabricated-contact-info': 'contains a phone number, email or link',
  'question-in-letter': 'contains a question',
  dialect: 'contains colloquial words',
  'informal-english': 'contains informal wording',
  'copied-informal-text': "copies the user's informal sentence",
  'duplicated-frame': 'contains a greeting, closing or name (they are added automatically)',
  'too-short': 'is too short to describe the problem',
  'wrong-language': 'is not written in the requested language',
  placeholder: 'contains placeholder text',
  empty: 'is empty',
}
function explain(issue: ValidationIssue): string {
  const base =
    ISSUE_EXPLANATION[issue.code] ?? `makes an unsupported claim (${issue.code.replace(/-/g, ' ')})`
  return `${base}: "${issue.detail}"`
}

/** Reference fields the server appends verbatim when the body lacks them. */
const REFERENCE_KEYS = [
  'account_or_meter_number',
  'bill_reference',
  'previous_report_number',
  'location_or_address',
] as const

function assembleLetter(input: DraftInput, draft: { subject: string; body: string }): string {
  const fields = input.collectedFields
  const missingRefs = REFERENCE_KEYS.map((key) => ({
    key,
    value: cleanSpaces(fields[key] ?? ''),
  })).filter(({ value }) => value && !draft.body.includes(value))
  if (input.locale === 'en') {
    const refs = missingRefs.map(
      ({ key, value }) => `${ENGLISH_FIELD_LABELS[key] ?? key}: ${value}`,
    )
    return [
      `To: ${entityDisplayName(input.entityName, 'en')}`,
      `Subject: ${draft.subject}`,
      'Dear Sir or Madam,',
      draft.body,
      refs.length ? `For reference:\n${refs.join('\n')}` : '',
      'Yours faithfully,',
      `Name: ${cleanSpaces(input.fullName)}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  const refs = missingRefs.map(
    ({ key, value }) => `${COMPLAINT_FIELD_LABELS[key] ?? key}: ${value}`,
  )
  return [
    `إلى: ${input.entityName}`,
    `الموضوع: ${draft.subject}`,
    'السلام عليكم ورحمة الله وبركاته،',
    draft.body,
    refs.length ? `للاستدلال:\n${refs.join('\n')}` : '',
    'وتفضلوا بقبول فائق الاحترام والتقدير،',
    `الاسم: ${cleanSpaces(input.fullName)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const CATEGORY: Record<string, { ar: string; en: string }> = {
  water: { ar: 'خدمات المياه والصرف الصحي', en: 'water and sewage services' },
  electricity: { ar: 'خدمات الكهرباء', en: 'electricity services' },
  telecom: { ar: 'خدمات الاتصالات والإنترنت', en: 'telecommunications and internet services' },
  commerce: {
    ar: 'حماية المستهلك والتعاملات التجارية',
    en: 'consumer protection and commercial transactions',
  },
  municipality: { ar: 'الخدمات البلدية', en: 'municipal services' },
}

/**
 * Drafts the letter. Never throws for model problems: every failure ends in
 * the deterministic builder with `meta.path = 'fallback'` and a reason.
 */
export async function draftComplaintLetter(
  input: DraftInput,
  call: LlamaCaller = runLlamaJson,
): Promise<DraftResult> {
  const started = Date.now()
  const style = input.style ?? 'standard'
  const sector = ENTITY_NAME_TO_SECTOR[input.entityName] ?? null
  const labels = input.locale === 'en' ? ENGLISH_FIELD_LABELS : COMPLAINT_FIELD_LABELS
  const sources = buildSources(input.userMessages ?? [], input.collectedFields, labels)
  const meta: DraftingMeta = {
    path: 'ai',
    model: null,
    fallbackReason: null,
    rejectedIssues: [],
    calls: 0,
    ms: { extract: 0, draft: 0, correct: 0, total: 0 },
    tokens: { prompt: 0, completion: 0 },
    neurons: 0,
    factsReused: false,
  }
  const remaining = () => TOTAL_BUDGET_MS - (Date.now() - started)
  const track = (result: LlamaJsonResult, phase: 'extract' | 'draft' | 'correct') => {
    meta.calls++
    meta.model = result.model
    meta.ms[phase] += result.ms
    if (result.usage) {
      meta.tokens.prompt += result.usage.promptTokens
      meta.tokens.completion += result.usage.completionTokens
    }
  }
  const finish = (result: Omit<DraftResult, 'meta'>): DraftResult => {
    meta.ms.total = Date.now() - started
    meta.neurons = Math.round(
      meta.tokens.prompt * NEURONS_PER_INPUT_TOKEN +
        meta.tokens.completion * NEURONS_PER_OUTPUT_TOKEN,
    )
    const generatedFromData = {
      ...result.letter.generatedFromData,
      drafting: { ...meta, style },
      ...(result.facts ? { facts: result.facts } : {}),
    }
    return { ...result, letter: { ...result.letter, generatedFromData }, meta }
  }
  const fallback = (
    reason: NonNullable<DraftingMeta['fallbackReason']>,
    facts: ComplaintFacts | null,
  ) => {
    meta.path = 'fallback'
    meta.fallbackReason = reason
    return finish({ letter: buildRulesLetter(input), facts, issues: [] })
  }

  // 1. Facts: reused when the case is unchanged, otherwise extracted.
  let facts: ComplaintFacts
  const previous = isStoredFacts(input.previousFacts) ? input.previousFacts : null
  const fingerprint = sourcesFingerprint(sources)
  if (previous && previous.fingerprint === fingerprint) {
    facts = previous
    meta.factsReused = true
  } else {
    try {
      const result = await call({
        system: EXTRACTION_SYSTEM,
        user: extractionUserPrompt(sources, input.locale),
        schema: EXTRACTION_SCHEMA,
        maxTokens: 900,
        timeoutMs: Math.min(EXTRACT_TIMEOUT_MS, remaining()),
        temperature: 0,
      })
      track(result, 'extract')
      facts = { ...groundFacts(result.json, sources, sector), fingerprint }
    } catch {
      return fallback(remaining() <= 0 ? 'timeout' : 'extraction_failed', null)
    }
  }

  const authorityNames = [input.entityName, entityDisplayName(input.entityName, 'en')]
  const allowedNames = [input.collectedFields.service_provider, input.collectedFields.merchant_name]
    .map((v) => cleanSpaces(v ?? ''))
    .filter(Boolean)
  const context = {
    userCorpus: corpusOf(sources),
    facts,
    authorityNames,
    allowedNames,
    locale: input.locale,
  }
  const recipient =
    input.locale === 'en' ? entityDisplayName(input.entityName, 'en') : input.entityName
  const system = draftSystemPrompt(input.locale, style)
  const user = draftUserPrompt({
    authorityName: recipient,
    category: sector ? CATEGORY[sector][input.locale] : '',
    facts: factsForDrafting(facts),
    locale: input.locale,
  })

  // 2. Draft.
  let draft: { subject: string; body: string } | null = null
  try {
    if (remaining() < 4_000) return fallback('timeout', facts)
    const result = await call({
      system,
      user,
      schema: DRAFT_SCHEMA,
      maxTokens: 1100,
      timeoutMs: Math.min(DRAFT_TIMEOUT_MS, remaining()),
      temperature: 0.3,
    })
    track(result, 'draft')
    draft = parseDraft(result.json)
  } catch {
    return fallback(remaining() <= 0 ? 'timeout' : 'draft_failed', facts)
  }
  if (!draft) return fallback('draft_failed', facts)

  // 3. Independent validation, one bounded correction.
  let validation = validateDraft(draft, context)
  if (!validation.ok) {
    meta.rejectedIssues.push(
      ...validation.issues.filter((i) => i.severity !== 'minor').map((i) => i.code),
    )
    if (remaining() < MIN_CORRECTION_MS) return fallback('validation_failed', facts)
    try {
      const result = await call({
        system,
        user: `${user}\n\n${correctionUserPrompt(
          draft,
          validation.issues.filter((i) => i.severity !== 'minor').map(explain),
        )}`,
        schema: DRAFT_SCHEMA,
        maxTokens: 1100,
        timeoutMs: Math.min(DRAFT_TIMEOUT_MS, remaining()),
        temperature: 0.1,
      })
      track(result, 'correct')
      const corrected = parseDraft(result.json)
      if (!corrected) return fallback('validation_failed', facts)
      draft = corrected
      validation = validateDraft(draft, context)
    } catch {
      return fallback('validation_failed', facts)
    }
    if (!validation.ok) {
      meta.rejectedIssues.push(
        ...validation.issues.filter((i) => i.severity !== 'minor').map((i) => i.code),
      )
      return fallback('validation_failed', facts)
    }
    meta.path = 'ai_corrected'
  }

  const complaintText = assembleLetter(input, draft)
  return finish({
    letter: {
      subject: draft.subject,
      complaintText,
      generatedFromData: {
        language: input.locale,
        entityName: input.entityName,
        fullName: cleanSpaces(input.fullName),
        subject: draft.subject,
        problemDescription: cleanSpaces(input.collectedFields.problem_description ?? ''),
        city: cleanSpaces(input.collectedFields.city ?? '') || undefined,
      },
    },
    facts,
    issues: validation.issues,
  })
}
