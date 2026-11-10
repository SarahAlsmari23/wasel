import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'

// The header comes from the shared app/(site)/layout.tsx.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        One branded canvas for the whole page. The wrapper spans every section;
        inside it a viewport-tall sticky layer paints the artwork and stays put
        while the content scrolls over it, so the page reads as a single
        continuous space instead of a background repeated per section.

        `isolate` keeps the -z-10 layer from escaping behind the page, and the
        wrapper ends before <SiteFooter />, which is exactly where the canvas
        stops and the footer's own solid surface begins.
      */}
      <main id="main-content" className="relative isolate flex-1">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="wasel-canvas sticky top-0 h-screen w-full" />
        </div>

        {children}
      </main>

      <SiteFooter />
    </>
  )
}
