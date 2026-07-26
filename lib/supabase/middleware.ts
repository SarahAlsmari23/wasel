import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Everything under /dashboard requires an authenticated session (Phase 3). */
const PROTECTED_PREFIX = '/dashboard'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug users being randomly
  // logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  // Guarding here (rather than only in the layout) is what lets the sign-in
  // link carry the exact page the user was trying to reach, so they land back
  // on it instead of the dashboard root.
  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/auth/sign-in'
    signInUrl.search = ''
    signInUrl.searchParams.set('next', `${pathname}${search}`)

    const redirectResponse = NextResponse.redirect(signInUrl)
    // Carry over any refreshed auth cookies so the session isn't dropped.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
