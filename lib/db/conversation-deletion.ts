import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

/**
 * Deletes one conversation's dependent rows, in FK-safe order, using the
 * service role — `messages`, `collected_information`, `complaints`, and
 * `complaint_versions` have no delete RLS policy for any client role (see
 * supabase/migrations/0006), so a normal authenticated client cannot remove
 * them at all. The conversation row itself is deleted separately by the
 * caller (deleteConversationAction) using the normal authenticated client,
 * since `conversations` already has a real "delete own conversations" RLS
 * policy that's sufficient enforcement on its own.
 *
 * Safe only because the caller must already have verified, via the
 * authenticated session, that the conversation belongs to the current user —
 * this function performs no ownership check of its own and trusts that
 * precondition (same pattern as saveCollectedFieldAsServiceRole).
 *
 * Order matters — none of these tables cascade on delete today (no migration
 * in this phase adds one):
 * 1. complaints.current_version_id is nulled first, breaking the circular
 *    complaints <-> complaint_versions FK pair (see supabase/migrations/0001's
 *    own comment on this), so complaint_versions can then be deleted without
 *    a foreign-key violation.
 * 2. complaint_versions (children of complaints) are deleted.
 * 3. complaints itself is deleted.
 * 4. collected_information, retrieval_logs, attachments (all reference
 *    conversation_id and/or message_id) are deleted before messages, so
 *    nothing is left pointing at a message row that's about to disappear.
 * 5. messages is deleted last, immediately before the caller removes the
 *    conversation row itself.
 */
export async function deleteConversationChildrenAsServiceRole(
  conversationId: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Conversation deletion is not configured.')
  }
  const supabase = createServiceRoleClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: complaintRows, error: complaintLookupError } = await supabase
    .from('complaints')
    .select('id')
    .eq('conversation_id', conversationId)

  if (complaintLookupError) {
    throw new Error('Failed to look up linked complaints.')
  }

  for (const complaint of complaintRows ?? []) {
    const complaintId = complaint.id as string

    const { error: unlinkError } = await supabase
      .from('complaints')
      .update({ current_version_id: null })
      .eq('id', complaintId)
    if (unlinkError) throw new Error('Failed to unlink complaint version.')

    const { error: versionsError } = await supabase
      .from('complaint_versions')
      .delete()
      .eq('complaint_id', complaintId)
    if (versionsError) throw new Error('Failed to delete complaint versions.')

    const { error: complaintError } = await supabase
      .from('complaints')
      .delete()
      .eq('id', complaintId)
    if (complaintError) throw new Error('Failed to delete complaint.')
  }

  const { error: collectedInfoError } = await supabase
    .from('collected_information')
    .delete()
    .eq('conversation_id', conversationId)
  if (collectedInfoError) throw new Error('Failed to delete collected information.')

  const { error: retrievalLogsError } = await supabase
    .from('retrieval_logs')
    .delete()
    .eq('conversation_id', conversationId)
  if (retrievalLogsError) throw new Error('Failed to delete retrieval logs.')

  const { error: attachmentsError } = await supabase
    .from('attachments')
    .delete()
    .eq('conversation_id', conversationId)
  if (attachmentsError) throw new Error('Failed to delete attachments.')

  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
  if (messagesError) throw new Error('Failed to delete messages.')
}
