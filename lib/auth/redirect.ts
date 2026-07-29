/** Where users land after signing in when no explicit destination is given. */
export const DEFAULT_SIGNED_IN_PATH = '/dashboard'

/**
 * Only same-origin, absolute-path destinations are accepted. Anything else
 * (protocol-relative URLs, absolute URLs, encoded tricks) falls back to the
 * default so a crafted `?next=` can never redirect a user off-site.
 */
export function resolveRedirectPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_SIGNED_IN_PATH
  if (!next.startsWith('/')) return DEFAULT_SIGNED_IN_PATH
  if (next.startsWith('//')) return DEFAULT_SIGNED_IN_PATH
  if (next.includes('\\')) return DEFAULT_SIGNED_IN_PATH
  return next
}
