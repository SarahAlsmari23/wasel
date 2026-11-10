import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/** Everything under /dashboard requires an authenticated session (Phase 3). */
const PROTECTED_PREFIX = '/dashboard'

/**
 * Upper bound for the Supabase Auth round trip made on every matched
 * request. Without one, a stalled call (slow token refresh, an Auth-side
 * incident) holds the middleware open until the platform kills it — which is
 * what surfaces as `504 MIDDLEWARE_INVOCATION_TIMEOUT`. Well inside Vercel's
 * middleware limit, well above a healthy round trip (~150–300 ms observed).
 */
const AUTH_CHECK_TIMEOUT_MS = 5_000

type AuthCheck = { status: 'ok'; user: User | null } | { status: 'timeout' }

async function getUserWithTimeout(
  getUser: () => Promise<{ data: { user: User | null } }>,
): Promise<AuthCheck> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<AuthCheck>((resolve) => {
    timer = setTimeout(() => resolve({ status: 'timeout' }), AUTH_CHECK_TIMEOUT_MS)
  })
  try {
    return await Promise.race([
      getUser().then(({ data }) => ({ status: 'ok', user: data.user }) as AuthCheck),
      timeout,
    ])
  } catch {
    // A network-level failure is treated exactly like a timeout.
    return { status: 'timeout' }
  } finally {
    clearTimeout(timer)
  }
}

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
  const authCheck = await getUserWithTimeout(() => supabase.auth.getUser())

  if (authCheck.status === 'timeout') {
    // Fail safe, not open: the request continues without a session refresh,
    // and every protected page still runs its own server-side session check
    // (app/(site)/(dashboard)/layout.tsx redirects when there is no user). Nothing
    // protected is ever rendered on the strength of this middleware alone.
    console.warn('[middleware] auth check exceeded time budget; continuing without refresh')
    return supabaseResponse
  }

  const { user } = authCheck
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

  // Signed-in users have no reason to see the sign-in / sign-up forms; send
  // them on to wherever they were heading instead.
  if (user && (pathname === '/auth/sign-in' || pathname === '/auth/sign-up')) {
    const next = request.nextUrl.searchParams.get('next')
    const destination = request.nextUrl.clone()
    destination.search = ''
    destination.pathname = '/'
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
      const target = new URL(next, request.nextUrl.origin)
      if (target.origin === request.nextUrl.origin && !target.pathname.startsWith('/auth/')) {
        destination.pathname = target.pathname
        destination.search = target.search
      }
    }
    const redirectResponse = NextResponse.redirect(destination)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
