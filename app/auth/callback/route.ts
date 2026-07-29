import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { resolveRedirectPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

const VALID_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && VALID_OTP_TYPES.includes(value as EmailOtpType)
}

/**
 * Completes every email-link and OAuth round-trip. Supabase can land here in
 * three shapes depending on the project's email template and flow type:
 *
 *   ?code=…                    PKCE (OAuth, and signUp initiated in this browser)
 *   ?token_hash=…&type=signup  templates using {{ .TokenHash }}
 *   ?error=…&error_code=…      expired or already-consumed links
 *
 * The previous version handled only the first and redirected everything else
 * to a bare `?error=auth`, which is why a failed confirmation gave no clue
 * about what went wrong. Failures now carry Supabase's own code and
 * description through to the sign-in page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = resolveRedirectPath(searchParams.get('next'))

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const providerError = searchParams.get('error')
  const providerErrorCode = searchParams.get('error_code')
  const providerErrorDescription = searchParams.get('error_description')

  function failure(errorCode: string, description: string) {
    const url = new URL('/auth/sign-in', origin)
    url.searchParams.set('error', 'auth')
    url.searchParams.set('error_code', errorCode)
    url.searchParams.set('error_description', description)
    url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  // Supabase rejected the link before we ever got here (expired, already used).
  if (providerError) {
    return failure(providerErrorCode ?? providerError, providerErrorDescription ?? providerError)
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return failure(error.code ?? 'exchange_failed', error.message)
  }

  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return failure(error.code ?? 'verify_failed', error.message)
  }

  return failure('missing_code', 'No authentication code or token hash was provided.')
}
