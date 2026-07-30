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
    // Mobile one-continuous-scroll fix — below `lg`, the page uses its
    // natural height (`min-h-dvh`, no `overflow-hidden`) so the browser's
    // own page scroll is the single scroll container for the whole
    // conversation (header excepted, which is `sticky` inside SiteHeader
    // itself). `overflow-x-hidden` still guards against any accidental
    // horizontal overflow.
    //
    // At `lg` and above this reverts to the original fixed-viewport shell
    // (`h-dvh`/`overflow-hidden`) so the composer stays pinned and only the
    // message list/card scroll independently, on mobile browsers with a
    // collapsing address bar too — unchanged desktop behavior.
    <div className="bg-background flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main id="main-content" className="flex flex-1 flex-col lg:min-h-0">
        {children}
      </main>
    </div>
  )
}
