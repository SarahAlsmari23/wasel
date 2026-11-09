/**
 * Where users land after signing in when no explicit destination is given.
 *
 * Signing in unlocks features; it does not move the user into a separate
 * area. Without a specific `next`, users return to the home page (where the
 * header now shows the Dashboard entry). Dashboard is only the destination
 * when the user explicitly headed there — protected routes always pass their
 * own path as `next`.
 */
export const DEFAULT_SIGNED_IN_PATH = '/'

/**
 * Only same-origin, absolute-path destinations are accepted. Anything else
 * (protocol-relative URLs, absolute URLs, encoded tricks, or the auth pages
 * themselves, which would loop) falls back to the default so a crafted
 * `?next=` can never redirect a user off-site.
 */
export function resolveRedirectPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_SIGNED_IN_PATH
  if (!next.startsWith('/')) return DEFAULT_SIGNED_IN_PATH
  if (next.startsWith('//')) return DEFAULT_SIGNED_IN_PATH
  if (next.includes('\\')) return DEFAULT_SIGNED_IN_PATH
  // Control characters (incl. encoded newlines/tabs some browsers strip) are
  // a classic way to smuggle "//host" past a prefix check.
  if (/[\u0000-\u001f\u007f]/.test(next)) return DEFAULT_SIGNED_IN_PATH
  let decoded = next
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return DEFAULT_SIGNED_IN_PATH
  }
  if (decoded.startsWith('//') || decoded.includes('\\')) return DEFAULT_SIGNED_IN_PATH
  if (next === '/auth' || next.startsWith('/auth/')) return DEFAULT_SIGNED_IN_PATH
  return next
}

/**
 * The sign-in / sign-up link for a page the user is currently on, carrying
 * that page as the return destination (never an auth page itself).
 */
export function authHrefWithReturn(
  base: '/auth/sign-in' | '/auth/sign-up',
  currentPath: string,
): string {
  const next = resolveRedirectPath(currentPath)
  return next === DEFAULT_SIGNED_IN_PATH ? base : `${base}?next=${encodeURIComponent(next)}`
}
