import { createClient } from '@supabase/supabase-js'

// Not exported. Never imported by anything outside this file. Constructed
// lazily so merely importing this module never requires the key to exist —
// same pattern as lib/rag/retrieve.ts's private getServiceRoleClient().
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Assistant message persistence is not configured.')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Inserts an assistant message using the service-role key, bypassing RLS
 * (the `messages` insert policy only ever allows `role='user'`, by design —
 * see supabase/migrations/0006). Safe only because the caller must already
 * have verified, via `verifyConversationOwnership` against the authenticated
 * session, that `conversationId` belongs to the current user — this function
 * performs no ownership check of its own and trusts that precondition.
 */
export async function insertAssistantMessageAsServiceRole(
  conversationId: string,
  content: string,
): Promise<void> {
  const supabase = getServiceRoleClient()
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content })

  if (error) {
    throw new Error('Failed to save assistant message.')
  }
}
