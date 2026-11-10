'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import {
  readLocaleCookieValue,
  useCommittedServerLocale,
  useSetLocale,
} from '@/components/i18n/locale-provider'
import {
  directionFor,
  htmlLangFor,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from '@/lib/i18n/config'

/**
 * Switches the interface language in place.
 *
 * Text and direction change together immediately: client components
 * re-render from copy already in the browser. Nothing is reloaded, so the
 * session, an open conversation and form values stay as they are.
 * Server-rendered text (page headings, metadata) follows when the background
 * refresh lands; LocaleProvider ignores a refresh that arrives after the user
 * has switched again. The cookie makes the choice persist across pages,
 * reloads and sign-in/out, and the chat sends it with every request so new AI
 * replies and complaints use it.
 */
export function useChangeLocale(): (next: Locale) => void {
  const setLocale = useSetLocale()
  const committedServerLocale = useCommittedServerLocale()
  const router = useRouter()
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(retryTimer.current), [])

  return useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
      document.documentElement.lang = htmlLangFor(next)
      document.documentElement.dir = directionFor(next)
      setLocale(next)
      router.refresh()

      // Next.js 15 sometimes fetches the refreshed page but never commits it
      // (vercel/next.js#77504), which would leave server-rendered headings in
      // the old language. Check that the server-rendered tree caught up and
      // refresh again if it did not (at most five times, backing off).
      clearTimeout(retryTimer.current)
      let attempt = 0
      const verify = () => {
        if (readLocaleCookieValue() !== next) return // the user switched again
        if (committedServerLocale.current === next || attempt >= 5) return
        attempt += 1
        router.refresh()
        retryTimer.current = setTimeout(verify, 800 * (attempt + 1))
      }
      retryTimer.current = setTimeout(verify, 800)
    },
    [committedServerLocale, router, setLocale],
  )
}
