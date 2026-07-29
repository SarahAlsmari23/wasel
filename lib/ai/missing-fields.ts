import { inferFieldAnswerShape, parseBooleanAnswer } from '@/lib/ai/intent-guards'
import type { ChatComplaintContext } from '@/types/ai'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Shape of one entry in complaint_types.required_fields (jsonb). Only
 * entries with `required: true` drive computeMissingFields — conditional/
 * scenario fields recorded separately in clarification_rules are not
 * evaluated here (deferred to a later, separately approved phase).
 */
export type RequiredField = {
  key: string
  label_ar: string
  required: boolean
}

export type MissingFieldsResult = {
  missingFields: string[]
  nextField: RequiredField | null
  nextQuestion: string | null
  readyToGenerateComplaint: boolean
}

function isRequiredField(value: unknown): value is RequiredField {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.label_ar === 'string' &&
    typeof candidate.required === 'boolean'
  )
}

/** Defensive parse of the jsonb column — malformed/unexpected entries are
 * dropped rather than trusted, since this ultimately drives what the server
 * asks for. */
export function parseRequiredFields(raw: unknown): RequiredField[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isRequiredField)
}

/**
 * Fetches and parses one complaint type's required_fields — the same read
 * app/api/ai/chat/route.ts already performs inline for a fresh turn;
 * extracted here so restoring a saved conversation (app/wasal/page.tsx) can
 * reuse it without duplicating the query. Public-read table, no
 * service-role client needed.
 */
export async function getRequiredFieldsForComplaintType(
  supabase: SupabaseServerClient,
  complaintTypeId: string,
): Promise<RequiredField[]> {
  const { data, error } = await supabase
    .from('complaint_types')
    .select('required_fields')
    .eq('id', complaintTypeId)
    .maybeSingle()

  if (error || !data) return []
  return parseRequiredFields(data.required_fields)
}

/** Shape of one entry in complaint_types.clarification_rules (jsonb). */
export type ClarificationRule = {
  key: string
  hint_ar: string
  condition: string
}

function isClarificationRule(value: unknown): value is ClarificationRule {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.hint_ar === 'string' &&
    typeof candidate.condition === 'string'
  )
}

export function parseClarificationRules(raw: unknown): ClarificationRule[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isClarificationRule)
}

/** The one hint for the one server-selected field — only ever looked up for
 * a single key at a time, never exposing the rest of the list to a caller
 * that only asks about one field. */
export function findClarificationHint(
  clarificationRules: ClarificationRule[],
  fieldKey: string,
): string | null {
  return clarificationRules.find((rule) => rule.key === fieldKey)?.hint_ar ?? null
}

function buildNextQuestion(field: RequiredField): string {
  const label = field.label_ar.trim()
  return label.endsWith('؟') ? label : `${label}؟`
}

/**
 * Deterministic, server-authoritative — no model call, no DB call. Given the
 * complaint type's required fields and the set of field keys already known,
 * returns exactly one next field to ask about (never a list), so the caller
 * can only ever surface one question at a time.
 */
export function computeMissingFields(
  requiredFields: RequiredField[],
  knownFieldKeys: ReadonlySet<string>,
): MissingFieldsResult {
  const unmet = requiredFields.filter((field) => field.required && !knownFieldKeys.has(field.key))
  const nextField = unmet[0] ?? null

  return {
    missingFields: unmet.map((field) => field.label_ar),
    nextField,
    nextQuestion: nextField ? buildNextQuestion(nextField) : null,
    readyToGenerateComplaint: unmet.length === 0,
  }
}

/**
 * Phase 7.6, Part 7 — a boolean-shaped field (`prior_provider_contact`) only
 * counts as genuinely "known" when its stored value can still be
 * confidently classified true/false via the single shared classifier
 * (lib/ai/intent-guards.ts's parseBooleanAnswer). Guards against a legacy
 * free-text row saved before Phase 7.6's canonical-boolean normalization
 * (Part 1) — such a row is never treated as satisfying the field forever;
 * it is re-asked instead (and thereby canonicalized on the next real
 * answer), so the ready-state guard (Part 7) never depends on an ambiguous
 * raw value. Every other field shape counts as known from mere presence,
 * exactly as before.
 */
export function isFieldValueUsable(fieldKey: string, value: string): boolean {
  if (inferFieldAnswerShape(fieldKey) !== 'boolean') return true
  return parseBooleanAnswer(value) !== null
}

/** Adds every key of `fields` whose value is actually usable (see
 * isFieldValueUsable) to `known` — shared by both callers below so a legacy
 * ambiguous boolean value is filtered out identically everywhere a
 * known-field set is assembled from a raw string map. */
function addUsableFieldKeys(known: Set<string>, fields: Record<string, string>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (isFieldValueUsable(key, value)) known.add(key)
  }
}

/**
 * Maps ChatComplaintContext onto required_fields' key space. `description`→
 * `problem_description` and `city`→`city` are the two fixed top-level slots;
 * `collectedFields` (Phase 4D) carries every other required-field key
 * (e.g. `merchant_name`, `service_provider`) the live complaint flow has
 * actually gathered, keyed to match `required_fields[].key` directly.
 */
export function buildKnownFieldKeysFromComplaintContext(
  complaintContext: ChatComplaintContext | undefined,
): Set<string> {
  const known = new Set<string>()
  if (!complaintContext) return known
  if (complaintContext.description) known.add('problem_description')
  if (complaintContext.city) known.add('city')
  addUsableFieldKeys(known, complaintContext.collectedFields ?? {})
  return known
}

/** Shared by app/api/ai/chat/route.ts and app/wasal/page.tsx to build a
 * known-field-key set directly from a persisted `collected_information` map
 * (field_key -> field_value), applying the same legacy-boolean filter. */
export function buildKnownFieldKeysFromPersistedFields(
  persistedFields: Record<string, string>,
): Set<string> {
  const known = new Set<string>()
  addUsableFieldKeys(known, persistedFields)
  return known
}
