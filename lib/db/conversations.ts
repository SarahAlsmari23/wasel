import { getDisplayTitle } from '@/lib/complaints/display'
import type { createClient } from '@/lib/supabase/server'
import type { MockConversation, MockMessage } from '@/types/conversation'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const TITLE_MAX_LENGTH = 60
const PREVIEW_MAX_LENGTH = 120

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength).trimEnd()}…`
}

/** All conversations created by this phase go through the general assistant
 * loop only (the complaint builder never persists) — so `mode` is always
 * `'assistant'`, and neither `entityName` nor `complaintId` is ever set yet. */
function toMockStatus(dbStatus: string): MockConversation['status'] {
  return dbStatus === 'completed' ? 'completed' : 'active'
}

type ConversationRow = {
  id: string
  title: string
  conversation_status: string
  conversation_type: string
  started_at: string
  updated_at: string
  complaints: {
    current_version: { generated_from_data: Record<string, unknown> | null } | null
  } | null
}

// `complaints` is embedded (reverse FK: complaints.conversation_id -> this
// row, unique) purely so a still-default-titled conversation can fall back
// to its generated complaint's subject (see toMockConversation) — the same
// disambiguated current_version embed already used in lib/db/complaints.ts.
const CONVERSATION_COLUMNS =
  'id, title, conversation_status, conversation_type, started_at, updated_at, complaints(current_version:complaint_versions!complaints_current_version_id_fkey(generated_from_data))'

function extractComplaintSubject(row: ConversationRow): string | null {
  const generatedFromData = row.complaints?.current_version?.generated_from_data
  const subject = generatedFromData?.subject
  return typeof subject === 'string' ? subject : null
}

type MessageRow = {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

function toMockMessage(row: MessageRow): MockMessage {
  return {
    id: row.id,
    // Only 'user'/'assistant' rows are ever written by this phase — the
    // 'system' role permitted by the schema is never inserted here.
    role: row.role as MockMessage['role'],
    content: row.content,
    createdAt: row.created_at,
  }
}

function toMockConversation(row: ConversationRow, preview: string): MockConversation {
  return {
    id: row.id,
    title: getDisplayTitle({ title: row.title, complaintSubject: extractComplaintSubject(row) }),
    preview,
    mode: row.conversation_type === 'complaint' ? 'complaint' : 'assistant',
    status: toMockStatus(row.conversation_status),
    createdAt: row.started_at,
    updatedAt: row.updated_at,
    messages: [],
  }
}

/**
 * Creates a conversation owned by `userId`, titled from `firstMessageContent`.
 * Runs under RLS via the caller's authenticated client — the "insert own
 * conversations" policy (`user_id = auth.uid()`) is the actual enforcement,
 * this just supplies a matching `user_id`.
 */
export async function createConversation(
  supabase: SupabaseServerClient,
  userId: string,
  firstMessageContent: string,
  conversationType: 'assistant' | 'complaint' = 'assistant',
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: truncate(firstMessageContent, TITLE_MAX_LENGTH),
      conversation_type: conversationType,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to create conversation.')
  }

  return { id: data.id as string }
}

/** Relies on the "insert own user messages" RLS policy (role='user' +
 * ownership) for enforcement — this call fails outright if `conversationId`
 * isn't owned by the caller's session. Returns the new row's id so callers
 * can attribute a later, related write (e.g. a collected complaint field) to
 * the message that produced it. */
export async function insertUserMessage(
  supabase: SupabaseServerClient,
  conversationId: string,
  content: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'user', content })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to save user message.')
  }

  return { id: data.id as string }
}

export async function touchConversationMetadata(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) {
    throw new Error('Failed to update conversation metadata.')
  }
}

/**
 * Explicit ownership check via the authenticated session (RLS-scoped select)
 * — the load-bearing precondition before any service-role write is allowed.
 */
export async function verifyConversationOwnership(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  return !error && data !== null
}

/**
 * Reads a conversation's title, scoped to `userId` — combines the ownership
 * check and the title read in one query (same fail-closed shape as the rest
 * of this module: a foreign or nonexistent conversationId both return null,
 * indistinguishably). Used by complaint creation to both confirm ownership
 * and source the letter's subject/title in a single round trip.
 */
export async function getOwnedConversationTitle(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data.title as string
}

/**
 * Reads every `role='user'` message in a conversation, chronological —
 * scoped by "select own messages" RLS (via the conversation ownership join,
 * see supabase/migrations/0006), same as `getConversationWithMessages`. Used
 * by the formal-letter rewriter (lib/complaints/narrative.ts) so it reasons
 * over the whole conversation, not just `problem_description` alone. Never
 * includes assistant/system messages.
 */
export async function getUserMessageContents(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as { content: string }[]).map((row) => row.content)
}

/**
 * Unconditionally sets a conversation's title, scoped to `userId` (same
 * belt-and-suspenders pattern as every other write in this module). Callers
 * decide *whether* it's safe to overwrite (via `isMeaningfulTitle`) before
 * calling this — it performs no generic-title check of its own, so it can be
 * reused both by a fresh read-then-write caller and by a caller that already
 * has the current title in scope from an earlier read (Phase 6.7, Part 1).
 */
export async function setConversationTitle(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .eq('user_id', userId)

  return !error
}

/**
 * Lists the caller's conversations with a preview drawn from each
 * conversation's latest message. RLS alone scopes both queries to the
 * caller — no redundant app-layer `user_id` filter is needed.
 */
export async function getUserConversations(
  supabase: SupabaseServerClient,
): Promise<MockConversation[]> {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .order('updated_at', { ascending: false })

  if (conversationsError) {
    throw new Error('Failed to load conversations.')
  }

  const rows = (conversations ?? []) as unknown as ConversationRow[]
  if (rows.length === 0) return []

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, created_at')
    .in(
      'conversation_id',
      rows.map((row) => row.id),
    )
    .order('created_at', { ascending: false })

  if (messagesError) {
    throw new Error('Failed to load conversation previews.')
  }

  const latestContentByConversationId = new Map<string, string>()
  for (const message of (messages ?? []) as MessageRow[]) {
    if (!latestContentByConversationId.has(message.conversation_id)) {
      latestContentByConversationId.set(message.conversation_id, message.content)
    }
  }

  return rows.map((row) =>
    toMockConversation(
      row,
      truncate(latestContentByConversationId.get(row.id) ?? '', PREVIEW_MAX_LENGTH),
    ),
  )
}

export type DraftRecord = {
  /** The conversation's own id — a draft has no complaint row yet, so this
   * doubles as the id used for both "continue" (resume) and delete. */
  id: string
  title: string
  entityName: string | null
  updatedAt: string
}

type DraftRow = {
  id: string
  title: string
  updated_at: string
  government_entities: { name_ar: string } | null
  complaints: { id: string } | null
}

// A "draft" (Phase 6.8) is a complaint-mode conversation that has not yet
// produced a real complaint row — `createComplaintAction` always inserts,
// versions, and finalizes a complaint in the same call (see
// app/wasal/complaint-actions.ts), so a conversation only ever sits in this
// state while the user is still mid-collection. There is no separate drafts
// table and none is added here. `complaints(id)` is the same disambiguated
// reverse-FK embed pattern already used for `current_version` above — it
// comes back as at most one row (complaints.conversation_id is unique), so a
// draft is simply a row where that embed is absent.
const DRAFT_COLUMNS = 'id, title, updated_at, government_entities(name_ar), complaints(id)'

/**
 * Lists the caller's own in-progress complaint drafts, newest first. Runs
 * under the caller's normal authenticated client — the "select own
 * conversations" RLS policy is the actual enforcement, no service role.
 */
export async function getUserDrafts(supabase: SupabaseServerClient): Promise<DraftRecord[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(DRAFT_COLUMNS)
    .eq('conversation_type', 'complaint')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error('Failed to load drafts.')
  }

  const rows = (data ?? []) as unknown as DraftRow[]
  return rows
    .filter((row) => !row.complaints)
    .map((row) => ({
      id: row.id,
      title: getDisplayTitle({ title: row.title }),
      entityName: row.government_entities?.name_ar ?? null,
      updatedAt: row.updated_at,
    }))
}

/** All three raw, database-backed routing identifiers — never a partial
 * shape. See getSavedRouting: a saved record is only ever returned once all
 * three are confirmed non-null. */
export type SavedRoutingIds = {
  entityId: string
  serviceId: string
  complaintTypeId: string
}

/**
 * Reads previously-saved routing for one conversation, scoped to `userId` at
 * the query level (belt-and-suspenders alongside the "select own
 * conversations" RLS policy — a conversationId that doesn't exist or isn't
 * owned by this user returns null either way, indistinguishably). Returns
 * null unless entity_id, service_id, AND complaint_type_id are all present —
 * a partial saved routing (e.g. from an older seed row lacking
 * complaint_type_id) is never treated as reusable (Phase 4D.1).
 */
export async function getSavedRouting(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
): Promise<SavedRoutingIds | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('entity_id, service_id, complaint_type_id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  if (!data.entity_id || !data.service_id || !data.complaint_type_id) return null

  return {
    entityId: data.entity_id as string,
    serviceId: data.service_id as string,
    complaintTypeId: data.complaint_type_id as string,
  }
}

/**
 * Persists a trustworthy routing decision onto its conversation, scoped to
 * `userId` at the query level in addition to the "update own conversations"
 * RLS policy. Runs under the caller's normal authenticated client — no
 * service-role usage.
 *
 * Retries exactly once on a transient failure (never more — no unbounded
 * retry loop) before giving up. The caller (route.ts) uses whether this
 * ultimately throws to decide the honest `routingPersisted` signal it
 * returns to the client (Phase 6.6F) — it no longer just logs and moves on.
 */
export async function updateConversationRouting(
  supabase: SupabaseServerClient,
  conversationId: string,
  userId: string,
  routing: { entityId: string | null; serviceId: string | null; complaintTypeId: string | null },
): Promise<void> {
  async function attempt() {
    const { error } = await supabase
      .from('conversations')
      .update({
        entity_id: routing.entityId,
        service_id: routing.serviceId,
        complaint_type_id: routing.complaintTypeId,
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
    return error
  }

  let error = await attempt()
  if (error) {
    error = await attempt()
  }

  if (error) {
    throw new Error('Failed to save conversation routing.')
  }
}

/**
 * Reads one conversation with its messages. Returns `null` when the
 * conversation doesn't exist or isn't owned by the caller — RLS filters the
 * row out entirely rather than returning an authorization error, so both
 * cases look identical here, matching the existing `notFound()` UX for an
 * unknown mock id.
 */
export async function getConversationWithMessages(
  supabase: SupabaseServerClient,
  conversationId: string,
): Promise<MockConversation | null> {
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (conversationError || !conversation) return null

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error('Failed to load conversation messages.')
  }

  const mockMessages = ((messages ?? []) as MessageRow[]).map(toMockMessage)
  const preview = mockMessages.length > 0 ? mockMessages[mockMessages.length - 1].content : ''

  return {
    ...toMockConversation(
      conversation as unknown as ConversationRow,
      truncate(preview, PREVIEW_MAX_LENGTH),
    ),
    messages: mockMessages,
  }
}
