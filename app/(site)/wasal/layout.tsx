import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    title: 'واصل — المساعد الذكي',
    description: 'اسأل واصل عن بلاغك الحكومي، أو دعه يجهّز لك بلاغاً احترافياً جاهزاً للتقديم.',
  },
  en: {
    title: 'Wasel — AI assistant',
    description:
      'Ask Wasel about your government complaint, or let it prepare a professional complaint ready to submit.',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return COPY[await getLocale()]
}

export default function WasalLayout({ children }: { children: ReactNode }) {
  return (
    // The header comes from the shared app/(site)/layout.tsx.
    //
    // Mobile one-continuous-scroll fix — below `lg`, the page uses its
    // natural height so the browser's own page scroll is the single scroll
    // container for the whole conversation (the header stays `sticky`).
    //
    // At `lg` and above `data-viewport-shell` makes the shared layout lock to
    // the viewport (`h-dvh`/`overflow-hidden`), so the composer stays pinned
    // and only the message list/card scroll independently, on mobile browsers
    // with a collapsing address bar too — unchanged desktop behavior.
    <main
      id="main-content"
      data-viewport-shell=""
      className="flex flex-1 flex-col overflow-x-hidden lg:min-h-0"
    >
      {children}
    </main>
  )
}
