'use server'

import { isMeaningfulTitle } from '@/lib/complaints/display'
import { insertAssistantMessageAsServiceRole } from '@/lib/db/assistant-messages'
import { saveCollectedFieldAsServiceRole } from '@/lib/db/collected-information'
import {
  createConversation,
  getOwnedConversationTitle,
  getSavedRouting,
  insertUserMessage,
  setConversationTitle,
  touchConversationMetadata,
  verifyConversationOwnership,
} from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'

/**
 * Every action below is best-effort: persistence must never surface an error
 * to the chat UI, so failures are swallowed here rather than thrown. Identity
 * always comes from the authenticated session — never a client-supplied id.
 */

// TEMPORARY DIAGNOSTICS — structural only: operation name + success/failure.
// Never logs message content, user ids, conversation ids, or raw Supabase
// error bodies (only our own already-generic internal error messages, e.g.
// "Failed to create conversation."). Remove once Phase 1 persistence is
// confirmed working end-to-end.
function logDiag(operation: string, detail: string) {
  console.log(`[wasal-actions] ${operation}: ${detail}`)
}

export async function createConversationAction(
  firstMessageContent: string,
  conversationType: 'assistant' | 'complaint' = 'assistant',
): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    logDiag('createConversation', `user-resolved=${Boolean(user)}`)
    if (!user) return null

    const conversation = await createConversation(
      supabase,
      user.id,
      firstMessageContent,
      conversationType,
    )
    logDiag('createConversation', 'insert-success')
    return conversation.id
  } catch (error) {
    logDiag(
      'createConversation',
      `failed category=${error instanceof Error ? error.message : typeof error}`,
    )
    return null
  }
}

/** Returns the new message's id (or null on failure/no session) so a caller
 * can attribute a related collected-field write to it — see
 * saveCollectedFieldAction below. */
export async function saveUserMessageAction(
  conversationId: string,
  content: string,
): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    logDiag('saveUserMessage', `user-resolved=${Boolean(user)}`)
    if (!user) return null

    const message = await insertUserMessage(supabase, conversationId, content)
    logDiag('saveUserMessage', 'insert-success')
    await touchConversationMetadata(supabase, conversationId)
    logDiag('saveUserMessage', 'touch-metadata-success')
    return message.id
  } catch (error) {
    logDiag(
      'saveUserMessage',
      `failed category=${error instanceof Error ? error.message : typeof error}`,
    )
    return null
  }
}

/**
 * Persists one answered complaint field to collected_information — ownership
 * is verified against the authenticated session before the service-role
 * client (the only thing that can write to this read-only-for-clients table)
 * ever touches it, same pattern as saveAssistantMessageAction below.
 * Best-effort: a failure here must never surface to the chat UI.
 */
export async function saveCollectedFieldAction(
  conversationId: string,
  fieldKey: string,
  fieldValue: string,
  sourceMessageId?: string | null,
): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    logDiag('saveCollectedField', `user-resolved=${Boolean(user)}`)
    if (!user) return

    const owns = await verifyConversationOwnership(supabase, conversationId, user.id)
    logDiag('saveCollectedField', `ownership-verified=${owns}`)
    if (!owns) return

    await saveCollectedFieldAsServiceRole(conversationId, {
      fieldKey,
      fieldValue,
      sourceMessageId,
    })
    logDiag('saveCollectedField', 'upsert-success')
  } catch (error) {
    logDiag(
      'saveCollectedField',
      `failed category=${error instanceof Error ? error.message : typeof error}`,
    )
  }
}

/**
 * Persists a deterministic, auto-generated conversation title — but only
 * while the current stored title is still generic (never overwrites a
 * meaningful one, whether user-set or already auto-upgraded). Runs entirely
 * under the caller's normal authenticated client (`conversations` has full
 * owner CRUD via RLS, see supabase/migrations/0006) — no service role needed.
 * Returns whether the write actually happened, so the caller can decide
 * whether to reflect it locally (e.g. the browser tab title).
 */
export async function updateConversationTitleAction(
  conversationId: string,
  candidateTitle: string,
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const currentTitle = await getOwnedConversationTitle(supabase, conversationId, user.id)
    if (currentTitle === null || isMeaningfulTitle(currentTitle)) return false

    return await setConversationTitle(supabase, conversationId, user.id, candidateTitle)
  } catch {
    return false
  }
}

/**
 * Reports whether real, database-backed routing (entity/service/complaint
 * type) already exists for this conversation — a plain read, never a
 * recomputation. Used to keep the create-button's `isRoutingPersisted` signal
 * honest when the legacy fallback engine produced the current on-screen
 * analysis: that engine never calls updateConversationRouting itself, but an
 * earlier turn's real `/api/ai/chat` call may still have persisted routing
 * independently of whether generation itself succeeded (Phase 6.8, Part 3).
 * `getSavedRouting` already scopes by `user_id`, so ownership is enforced by
 * the query itself.
 */
export async function checkSavedRoutingAction(conversationId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const savedRouting = await getSavedRouting(supabase, conversationId, user.id)
    return savedRouting !== null
  } catch {
    return false
  }
}

/**
 * The one security-sensitive action: ownership is verified against the
 * authenticated session before the service-role client (the only thing that
 * can write role='assistant') ever touches the conversation.
 */
export async function saveAssistantMessageAction(
  conversationId: string,
  content: string,
): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    logDiag('saveAssistantMessage', `user-resolved=${Boolean(user)}`)
    if (!user) return

    const owns = await verifyConversationOwnership(supabase, conversationId, user.id)
    logDiag('saveAssistantMessage', `ownership-verified=${owns}`)
    if (!owns) return

    await insertAssistantMessageAsServiceRole(conversationId, content)
    logDiag('saveAssistantMessage', 'insert-success')
    await touchConversationMetadata(supabase, conversationId)
    logDiag('saveAssistantMessage', 'touch-metadata-success')
  } catch (error) {
    logDiag(
      'saveAssistantMessage',
      `failed category=${error instanceof Error ? error.message : typeof error}`,
    )
  }
}
