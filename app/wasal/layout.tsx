import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/marketing/site-header'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'واصل — المساعد الذكي',
  description: 'اسأل واصل عن بلاغك الحكومي، أو دعه يجهّز لك بلاغاً احترافياً جاهزاً للتقديم.',
}

export default async function WasalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    // h-dvh (not min-h) so the composer stays pinned and only the message
    // list scrolls, on mobile browsers with a collapsing address bar too.
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
