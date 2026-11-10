import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/marketing/site-header'
import { getCurrentUser } from '@/lib/auth/current-user'

/**
 * One header for the public website, the Wasel chat and the dashboard. It
 * lives in this shared layout so it stays mounted while the user moves
 * between them; only the content below it changes. The sign-in and sign-up
 * pages sit outside this group and keep their own layout.
 *
 * A child that needs a fixed-viewport shell on large screens (the chat) marks
 * itself with `data-viewport-shell`, and this wrapper then locks to the
 * viewport height so only the child's own panes scroll.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="bg-background flex min-h-dvh flex-col lg:has-[[data-viewport-shell]]:h-dvh lg:has-[[data-viewport-shell]]:overflow-hidden">
      <SiteHeader isAuthenticated={Boolean(user)} />
      {children}
    </div>
  )
}
