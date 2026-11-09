import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // API routes authenticate themselves (they call Supabase Auth directly), so
  // running the session middleware on them only doubled the auth round trips
  // per chat message. Static assets never need a session.
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|webmanifest)$).*)',
  ],
}
