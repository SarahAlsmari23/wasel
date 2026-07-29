import { createClient } from '@supabase/supabase-js'
import { COMPLAINT_FIELD_LABELS, KNOWN_COMPLAINT_FIELD_KEYS } from '@/lib/complaints/formal-letter'
import type { createClient as createServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>

const MAX_FIELD_VALUE_LENGTH = 500

// Defensive, independent of the allow-list below — a second line of defense
// in case a carelessly-added future key ever slips into
// KNOWN_COMPLAINT_FIELD_KEYS (mirrors the same defensive pattern already used
// in lib/complaints/formal-letter.ts).
const SENSITIVE_KEY_PATTERN = /national[_-]?id|password|token|secret|card|bank|account[_-]?number/i

// Not exported, not imported by anything outside this file — the one narrow
// service-role client this module uses, matching the established pattern in
// lib/db/assistant-messages.ts. `collected_information` intentionally has no
// insert/update/delete RLS policy for any client role (see
// supabase/migrations/0006) — only SELECT, scoped to the owning conversation.
// Safe only because the caller must already have verified, via the
// authenticated session, that the conversation belongs to the current user —
// this function performs no ownership check of its own and trusts that
// precondition.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Collected-field persistence is not configured.')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type SaveCollectedFieldInput = {
  fieldKey: string
  fieldValue: string
  sourceMessageId?: string | null
}

/**
 * Upserts one collected complaint field for a conversation — one row per
 * (conversation_id, field_key), matching the table's own unique constraint
 * (supabase/migrations/0001), so re-answering the same field never creates a
 * duplicate row. Every field persisted this way is, by construction, one the
 * server itself selected as the next required field (see
 * lib/ai/missing-fields.ts's computeMissingFields) — so `is_required` is
 * always `true` here; there is no path that writes an optional field.
 *
 * Silently no-ops (never throws) for anything outside the known, non-
 * sensitive complaint-field vocabulary, or an empty value — this is a
 * best-effort persistence helper, same as every other write in this flow.
 */
export async function saveCollectedFieldAsServiceRole(
  conversationId: string,
  input: SaveCollectedFieldInput,
): Promise<void> {
  if (!KNOWN_COMPLAINT_FIELD_KEYS.includes(input.fieldKey)) return
  if (SENSITIVE_KEY_PATTERN.test(input.fieldKey)) return

  const value = input.fieldValue.trim().slice(0, MAX_FIELD_VALUE_LENGTH)
  if (value === '') return

  const label = COMPLAINT_FIELD_LABELS[input.fieldKey]
  if (!label) return

  const supabase = getServiceRoleClient()
  const { error } = await supabase.from('collected_information').upsert(
    {
      conversation_id: conversationId,
      field_key: input.fieldKey,
      field_label_ar: label,
      field_value: value,
      source_message_id: input.sourceMessageId ?? null,
      is_required: true,
    },
    { onConflict: 'conversation_id,field_key' },
  )

  if (error) {
    throw new Error('Failed to save collected field.')
  }
}

/**
 * Reads every collected field for one conversation as a flat key→value map.
 * Runs under the caller's normal authenticated client — the "select own
 * collected_information" RLS policy (scoped via the parent conversation's
 * user_id) is the actual enforcement; a foreign or nonexistent
 * conversationId simply returns no rows, same fail-closed shape as the rest
 * of this app's read helpers.
 */
export async function getCollectedInformationForConversation(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('collected_information')
    .select('field_key, field_value')
    .eq('conversation_id', conversationId)

  if (error || !data) return {}

  const result: Record<string, string> = {}
  for (const row of data as { field_key: string; field_value: string | null }[]) {
    if (typeof row.field_value === 'string' && row.field_value !== '') {
      result[row.field_key] = row.field_value
    }
  }
  return result
}
