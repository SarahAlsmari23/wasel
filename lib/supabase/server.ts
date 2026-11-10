import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { withClockSkewRetry } from '@/lib/supabase/clock-skew-fetch'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Retries the transient PGRST303 rejection of a freshly issued token
      // (see clock-skew-fetch.ts).
      global: { fetch: withClockSkewRetry(fetch) },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch (error) {
            // Next.js throws here when called from a Server Component, where
            // cookies are read-only. That case is expected and harmless —
            // middleware refreshes the session on the next request.
            //
            // Any *other* failure means auth cookies were silently dropped in
            // a Route Handler or Server Action, which would log the user
            // straight back out with no visible cause, so it is logged rather
            // than swallowed.
            const isReadOnlyStoreError =
              error instanceof Error && /Server Component|readonly|read-only/i.test(error.message)

            if (!isReadOnlyStoreError) {
              console.error(
                '[supabase] failed to persist auth cookies:',
                error instanceof Error ? error.message : error,
              )
            }
          }
        },
      },
    },
  )
}
