/**
 * Phase 8, Part 1/16 — the single, shared reconstruction of "what does this
 * complaint still need" from persisted state. Before this module, the live
 * chat turn (app/api/ai/chat/route.ts) and the resume page
 * (app/wasal/page.tsx) each independently re-implemented the same sequence
 * (read complaint_types.required_fields, merge known field keys, call
 * computeMissingFields, look up a clarification hint) — two call sites that
 * could silently drift apart. Both now call this one function instead.
 *
 * `collected_information` (via `persistedFields`) is always the durable
 * source of truth (Phase 7.6/7.7) — this never scans chat history or trusts
 * client-held state on its own. `additionalKnownKeys` exists only so the
 * live turn can also count *this same turn's* own just-answered field before
 * its database write has necessarily landed yet (the client already sends it
 * in `complaintContext.collectedFields`) — it is never a substitute for the
 * persisted read, only an addition on top of it.
 */

import type { createClient } from '@/lib/supabase/server'
import {
  buildKnownFieldKeysFromPersistedFields,
  computeMissingFields,
  findClarificationHint,
  parseClarificationRules,
  parseRequiredFields,
  type MissingFieldsResult,
  type RequiredField,
} from '@/lib/ai/missing-fields'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type ComplaintCollectionState = {
  requiredFields: RequiredField[]
  missing: MissingFieldsResult
  /** The one clarification hint for `missing.nextField`, when there is one —
   * never the full rule list (see lib/ai/missing-fields.ts's own docstring). */
  nextFieldHint: string | null
}

export async function loadComplaintCollectionState(
  supabase: SupabaseServerClient,
  complaintTypeId: string,
  persistedFields: Record<string, string>,
  additionalKnownKeys?: ReadonlySet<string>,
): Promise<ComplaintCollectionState | null> {
  const { data, error } = await supabase
    .from('complaint_types')
    .select('required_fields, clarification_rules')
    .eq('id', complaintTypeId)
    .maybeSingle()

  if (error || !data) return null

  const requiredFields = parseRequiredFields(data.required_fields)
  const knownFieldKeys = buildKnownFieldKeysFromPersistedFields(persistedFields)
  if (additionalKnownKeys) {
    for (const key of additionalKnownKeys) knownFieldKeys.add(key)
  }

  const missing = computeMissingFields(requiredFields, knownFieldKeys)
  const clarificationRules = parseClarificationRules(data.clarification_rules)
  const nextFieldHint = missing.nextField
    ? findClarificationHint(clarificationRules, missing.nextField.key)
    : null

  return { requiredFields, missing, nextFieldHint }
}
