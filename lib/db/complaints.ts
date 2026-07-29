import { createClient as createServiceRoleClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Thrown when an insert collides with the `unique` constraint on
 * `complaints.conversation_id` — the DB-level enforcement of "at most one
 * complaint per conversation". Callers (the future create action) can catch
 * this specifically to look up and return the existing complaint instead of
 * surfacing a raw error.
 */
export class ComplaintAlreadyExistsError extends Error {
  constructor() {
    super('A complaint already exists for this conversation.')
    this.name = 'ComplaintAlreadyExistsError'
  }
}

// Not exported, not imported by anything outside this file — the one narrow
// service-role client this module uses, matching lib/db/assistant-messages.ts's
// established pattern. `complaints`/`complaint_versions` intentionally have no
// insert/update/delete RLS policy for any client role (see
// supabase/migrations/0006) — only SELECT, scoped to the owning user. Writes
// are only ever safe once the caller has independently verified (via the
// authenticated client) that the conversation/complaint belongs to the
// current session — this module trusts that precondition and performs no
// ownership check of its own.
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Complaint persistence is not configured.')
  }
  return createServiceRoleClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Excludes visually ambiguous characters (0/O, 1/I/L) so a reference number
// read aloud or hand-copied doesn't misresolve — purely a usability choice,
// does not reduce how hard the value is to guess (still drawn from a 32-symbol
// alphabet via cryptographically strong randomness, not a counter).
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const REFERENCE_RANDOM_LENGTH = 8
const REFERENCE_PREFIX = 'WSL-'

/**
 * Generates a non-sequential, hard-to-guess internal Wasal reference (e.g.
 * `WSL-K8R4P7MX`) — never a real government complaint number, and never
 * derived from any predictable counter or timestamp.
 */
export function generateComplaintReference(): string {
  const bytes = randomBytes(REFERENCE_RANDOM_LENGTH)
  let suffix = ''
  for (let i = 0; i < REFERENCE_RANDOM_LENGTH; i++) {
    suffix += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length]
  }
  return `${REFERENCE_PREFIX}${suffix}`
}

export type CreateComplaintInput = {
  conversationId: string
  userId: string
  entityId: string
  serviceId: string
  complaintTypeId: string
  referenceNumber: string
}

/**
 * Inserts the complaint row itself, at the DB's default `status = 'draft'`.
 * The caller is expected to immediately follow this with
 * `createComplaintVersion` + `markComplaintGenerated` in the same request —
 * see `deleteComplaintRecord` for the cleanup path if that doesn't happen.
 */
export async function createComplaintRecord(
  input: CreateComplaintInput,
): Promise<{ id: string; createdAt: string }> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      entity_id: input.entityId,
      service_id: input.serviceId,
      complaint_type_id: input.complaintTypeId,
      reference_number: input.referenceNumber,
    })
    .select('id, created_at')
    .single()

  if (error) {
    // Postgres unique_violation. `conversation_id` is by far the more likely
    // real-world trigger (a duplicate create attempt) than the astronomically
    // unlikely `reference_number` collision — either way, the caller's
    // retry/lookup logic is the same, so both are reported identically.
    if (error.code === '23505') {
      throw new ComplaintAlreadyExistsError()
    }
    throw new Error('Failed to create complaint.')
  }
  if (!data) {
    throw new Error('Failed to create complaint.')
  }

  return { id: data.id as string, createdAt: data.created_at as string }
}

/** Best-effort cleanup when a later step in the same creation flow fails —
 * removes the just-inserted complaint row so it never sits half-finished
 * (no version, no letter) and visible to the user. */
export async function deleteComplaintRecord(complaintId: string): Promise<void> {
  const supabase = getServiceRoleClient()
  await supabase.from('complaints').delete().eq('id', complaintId)
}

export type CreateComplaintVersionInput = {
  complaintId: string
  complaintText: string
  generatedFromData: Record<string, unknown>
  changeSummary?: string
}

/** Always inserts as version 1, is_current — this module doesn't yet support
 * multiple versions (that's a later, separately approved "regenerate
 * wording" phase); today's only caller creates exactly one version per
 * complaint, immediately after `createComplaintRecord`. */
export async function createComplaintVersion(
  input: CreateComplaintVersionInput,
): Promise<{ id: string }> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('complaint_versions')
    .insert({
      complaint_id: input.complaintId,
      version_number: 1,
      complaint_text: input.complaintText,
      generated_from_data: input.generatedFromData,
      change_summary: input.changeSummary,
      is_current: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to create complaint version.')
  }

  return { id: data.id as string }
}

/** Marks the complaint as having a real, generated letter — `status`
 * transitions from the DB default `'draft'` to `'generated'` and
 * `generated_at`/`current_version_id` are set together, atomically. Returns
 * the row's fresh `updated_at` (set by the `set_updated_at` trigger) so the
 * caller can build its response without a separate re-read (Phase 6.7,
 * Part 4). */
export async function markComplaintGenerated(
  complaintId: string,
  currentVersionId: string,
): Promise<{ updatedAt: string }> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('complaints')
    .update({
      status: 'generated',
      current_version_id: currentVersionId,
      generated_at: new Date().toISOString(),
    })
    .eq('id', complaintId)
    .select('updated_at')
    .single()

  if (error || !data) {
    throw new Error('Failed to finalize complaint generation.')
  }

  return { updatedAt: data.updated_at as string }
}

/** Records that the user submitted the complaint to the authority themselves
 * — independent of `status` (see the Phase 6 design: `submitted_at` is the
 * submission signal, not a `'submitted'` status value, which doesn't exist in
 * the schema). */
export async function markComplaintSubmitted(complaintId: string): Promise<void> {
  const supabase = getServiceRoleClient()
  const { error } = await supabase
    .from('complaints')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', complaintId)

  if (error) {
    throw new Error('Failed to mark complaint as submitted.')
  }
}

type ComplaintRow = {
  id: string
  conversation_id: string
  reference_number: string
  status: string
  submitted_at: string | null
  created_at: string
  updated_at: string
  entity_id: string | null
  conversations: { title: string } | null
  government_entities: { name_ar: string } | null
  government_services: { official_url: string | null } | null
  current_version: {
    complaint_text: string
    generated_from_data: Record<string, unknown> | null
  } | null
}

export type ComplaintRecord = {
  id: string
  conversationId: string
  title: string
  entityId: string | null
  entityName: string | null
  referenceNumber: string
  status: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  officialUrl: string | null
  /** From the current version's generated_from_data (see buildFormalComplaintLetter)
   * — used as the display-title fallback when the conversation never got a
   * real title. Empty string if no current version exists yet (e.g. 'draft'). */
  subject: string
  /** The current version's formal letter text — empty string if no current
   * version exists yet. */
  complaintText: string
}

function toComplaintRecord(row: ComplaintRow): ComplaintRecord {
  const subject = row.current_version?.generated_from_data?.subject
  return {
    id: row.id,
    conversationId: row.conversation_id,
    title: row.conversations?.title ?? '',
    entityId: row.entity_id,
    entityName: row.government_entities?.name_ar ?? null,
    referenceNumber: row.reference_number,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    officialUrl: row.government_services?.official_url ?? null,
    subject: typeof subject === 'string' ? subject : '',
    complaintText: row.current_version?.complaint_text ?? '',
  }
}

// `current_version` is aliased and disambiguated via the FK constraint name
// because complaints and complaint_versions have two relationships
// (complaint_versions.complaint_id -> complaints.id, and
// complaints.current_version_id -> complaint_versions.id) — PostgREST needs
// the explicit constraint name to know which one this embed follows.
const COMPLAINT_SELECT =
  'id, conversation_id, reference_number, status, submitted_at, created_at, updated_at, entity_id, conversations(title), government_entities(name_ar), government_services(official_url), current_version:complaint_versions!complaints_current_version_id_fkey(complaint_text, generated_from_data)'

/**
 * Lists the caller's own complaints, newest first. Runs under the caller's
 * normal authenticated client — the "select own complaints" RLS policy
 * (`user_id = auth.uid()`) is the actual enforcement, this needs no
 * additional app-layer filter.
 */
export async function getUserComplaints(
  supabase: SupabaseServerClient,
): Promise<ComplaintRecord[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_SELECT)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error('Failed to load complaints.')
  }

  return ((data ?? []) as unknown as ComplaintRow[]).map(toComplaintRecord)
}

/**
 * Reads one complaint owned by the caller. Returns null when it doesn't
 * exist or isn't owned — RLS filters the row out entirely rather than
 * returning an authorization error, so both cases are indistinguishable here,
 * matching the same pattern already used for conversations.
 */
export async function getComplaintById(
  supabase: SupabaseServerClient,
  complaintId: string,
): Promise<ComplaintRecord | null> {
  const { data, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_SELECT)
    .eq('id', complaintId)
    .maybeSingle()

  if (error || !data) return null
  return toComplaintRecord(data as unknown as ComplaintRow)
}

/**
 * Reads the current version's letter text for one complaint. Runs under the
 * caller's authenticated client — "select own complaint_versions" RLS scopes
 * this transitively via the parent complaint's ownership.
 */
export async function getCurrentComplaintVersionText(
  supabase: SupabaseServerClient,
  complaintId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('complaint_versions')
    .select('complaint_text')
    .eq('complaint_id', complaintId)
    .eq('is_current', true)
    .maybeSingle()

  if (error || !data) return null
  return data.complaint_text as string
}

/**
 * Reads one complaint by its (unique) `conversation_id`, scoped to `userId` —
 * used to recover the already-existing complaint when a create attempt hits
 * the "one complaint per conversation" constraint, so a duplicate attempt
 * can still return the real record instead of a bare failure.
 */
export async function getComplaintByConversationId(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
): Promise<ComplaintRecord | null> {
  const { data, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_SELECT)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return toComplaintRecord(data as unknown as ComplaintRow)
}

/**
 * Reads the current version's letter text *and* the subject it was built
 * with (subject has no dedicated column — it's stored inside
 * `generated_from_data`, the same sanitized snapshot `buildFormalComplaintLetter`
 * produced it from). Used to recover a complaint's full displayable letter
 * without regenerating it.
 */
export async function getCurrentComplaintVersion(
  supabase: SupabaseServerClient,
  complaintId: string,
): Promise<{ complaintText: string; subject: string } | null> {
  const { data, error } = await supabase
    .from('complaint_versions')
    .select('complaint_text, generated_from_data')
    .eq('complaint_id', complaintId)
    .eq('is_current', true)
    .maybeSingle()

  if (error || !data) return null

  const generatedFromData = data.generated_from_data as Record<string, unknown> | null
  const subject = typeof generatedFromData?.subject === 'string' ? generatedFromData.subject : ''

  return { complaintText: data.complaint_text as string, subject }
}
