import type { User } from '@supabase/supabase-js'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * The signed-in user for the current request, verified with Supabase Auth.
 *
 * React's `cache` scopes the result to one server render, so the shared site
 * layout, the dashboard layout and the page reuse a single Auth round trip
 * instead of making one each. It is never shared between requests or users.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
