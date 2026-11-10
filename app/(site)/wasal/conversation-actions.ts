'use server'

import { deleteConversationChildrenAsServiceRole } from '@/lib/db/conversation-deletion'
import { verifyConversationOwnership } from '@/lib/db/conversations'
import { createClient } from '@/lib/supabase/server'

const ERROR_UNAUTHENTICATED = 'يجب تسجيل الدخول لحذف المحادثة.'
const ERROR_NOT_FOUND = 'تعذر العثور على المحادثة أو لا تملك صلاحية الوصول إليها.'
const ERROR_UNEXPECTED = 'حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.'

export type DeleteConversationResult = { success: true } | { success: false; error: string }

/**
 * Permanently deletes one conversation and every row that depends on it
 * (messages, collected_information, complaints, complaint_versions) —
 * Phase 6.7, Part 2. Ownership is verified against the authenticated session
 * before anything is touched; never accepts or trusts a client-supplied user
 * id. Never exposes a raw database error to the caller.
 */
export async function deleteConversationAction(
  conversationId: string,
): Promise<DeleteConversationResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: ERROR_UNAUTHENTICATED }
    }

    const owns = await verifyConversationOwnership(supabase, conversationId, user.id)
    if (!owns) {
      return { success: false, error: ERROR_NOT_FOUND }
    }

    await deleteConversationChildrenAsServiceRole(conversationId)

    // The conversation row itself is deleted under the caller's normal
    // authenticated client — "delete own conversations" RLS (see
    // supabase/migrations/0006) is real, sufficient enforcement here, no
    // service role needed for this one.
    const { error, count } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (error || !count) {
      return { success: false, error: ERROR_UNEXPECTED }
    }

    return { success: true }
  } catch {
    return { success: false, error: ERROR_UNEXPECTED }
  }
}
