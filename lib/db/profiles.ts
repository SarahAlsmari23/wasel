import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Reads the authenticated user's real, stored full name — never the
 * auth-session's `user_metadata` (a different source; see the Phase 6 audit).
 * Runs under the caller's normal authenticated client — RLS's "select own
 * profile" policy (`id = auth.uid()`) is the actual enforcement, this just
 * scopes the query to match. Returns null rather than a placeholder when the
 * user never set one — callers decide how to handle that themselves.
 */
export async function getProfileFullName(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.full_name) return null
  return data.full_name as string
}
