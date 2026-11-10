'use server'

import { createClient } from '@/lib/supabase/server'

export type AccountExport = {
  exportedAt: string
  account: { email: string | null; fullName: string | null; createdAt: string | null }
  conversations: {
    id: string
    title: string
    type: string
    createdAt: string
    messages: { role: string; content: string; createdAt: string }[]
  }[]
  complaints: {
    id: string
    referenceNumber: string
    status: string
    submittedAt: string | null
    createdAt: string
    versions: { versionNumber: number; text: string; createdAt: string; isCurrent: boolean }[]
  }[]
}

export type ExportMyDataResult = { success: true; data: AccountExport } | { success: false }

/**
 * A copy of everything Wasel stores for the signed-in user. Every read goes
 * through the caller's own RLS-scoped client — it can only ever return the
 * caller's own rows, and never uses the service role.
 */
export async function exportMyDataAction(): Promise<ExportMyDataResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const [conversationsResult, complaintsResult] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, title, conversation_type, created_at, messages(role, content, created_at)')
        .order('created_at', { ascending: true }),
      supabase
        .from('complaints')
        .select(
          'id, reference_number, status, submitted_at, created_at, complaint_versions!complaint_versions_complaint_id_fkey(version_number, complaint_text, created_at, is_current)',
        )
        .order('created_at', { ascending: true }),
    ])

    if (conversationsResult.error || complaintsResult.error) return { success: false }

    type ConversationRow = {
      id: string
      title: string
      conversation_type: string
      created_at: string
      messages: { role: string; content: string; created_at: string }[] | null
    }
    type ComplaintRow = {
      id: string
      reference_number: string
      status: string
      submitted_at: string | null
      created_at: string
      complaint_versions:
        | {
            version_number: number
            complaint_text: string
            created_at: string
            is_current: boolean
          }[]
        | null
    }

    const metadataName = user.user_metadata?.full_name
    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        account: {
          email: user.email ?? null,
          fullName: typeof metadataName === 'string' ? metadataName : null,
          createdAt: user.created_at ?? null,
        },
        conversations: ((conversationsResult.data ?? []) as ConversationRow[]).map((row) => ({
          id: row.id,
          title: row.title,
          type: row.conversation_type,
          createdAt: row.created_at,
          messages: (row.messages ?? [])
            .slice()
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((message) => ({
              role: message.role,
              content: message.content,
              createdAt: message.created_at,
            })),
        })),
        complaints: ((complaintsResult.data ?? []) as ComplaintRow[]).map((row) => ({
          id: row.id,
          referenceNumber: row.reference_number,
          status: row.status,
          submittedAt: row.submitted_at,
          createdAt: row.created_at,
          versions: (row.complaint_versions ?? [])
            .slice()
            .sort((a, b) => a.version_number - b.version_number)
            .map((version) => ({
              versionNumber: version.version_number,
              text: version.complaint_text,
              createdAt: version.created_at,
              isCurrent: version.is_current,
            })),
        })),
      },
    }
  } catch {
    return { success: false }
  }
}
