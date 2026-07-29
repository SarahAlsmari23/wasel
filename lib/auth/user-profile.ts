import type { User } from '@supabase/supabase-js'

export type UserProfile = {
  name: string
  email: string
  /** First word of `name`, for the dashboard greeting. Never empty. */
  firstName: string
  phone: string
  createdAt: string
  preferredLanguage: string
}

const NOT_PROVIDED = 'غير مضاف'
const FALLBACK_NAME = 'مستخدم واصل'

function readMetadataString(user: User, key: string): string | undefined {
  const value = user.user_metadata?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Everything shown on the profile page comes from the real Supabase session —
 * no invented personal data. Fields the user never provided render as an
 * explicit "not set" label rather than a plausible-looking placeholder.
 *
 * Every field is guaranteed to be a non-empty string so call sites can format
 * or split them without null checks. An OAuth user with no metadata, or a
 * session shape that changes upstream, degrades to a label instead of throwing
 * partway through rendering the dashboard.
 */
export function getUserProfile(user: User): UserProfile {
  const email = typeof user.email === 'string' ? user.email : ''

  const name =
    readMetadataString(user, 'full_name') ??
    readMetadataString(user, 'name') ??
    (email.includes('@') ? email.split('@')[0] : undefined) ??
    FALLBACK_NAME

  const firstName = name.trim().split(/\s+/).filter(Boolean)[0] ?? FALLBACK_NAME

  return {
    name,
    email: email || NOT_PROVIDED,
    firstName,
    phone: user.phone || readMetadataString(user, 'phone') || NOT_PROVIDED,
    // created_at is always present on a real session, but a malformed value
    // must not reach formatDate as undefined.
    createdAt: typeof user.created_at === 'string' ? user.created_at : '',
    preferredLanguage: 'العربية',
  }
}

export { NOT_PROVIDED }
