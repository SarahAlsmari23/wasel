import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { HeroIllustration } from '@/components/marketing/hero-illustration'
import { buttonClasses } from '@/components/ui/button'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    badge: 'منصة ذكية لتوجيه البلاغات الحكومية',
    brand: 'واصل',
    tagline: '... خلها توصل صح',
    lead: 'يساعدك واصل على فهم شكواك، وتحديد الجهة الحكومية المناسبة، وصياغة البلاغ باحترافية قبل إرساله.',
    start: 'ابدأ وخَلّها توصل',
    how: 'كيف يعمل واصل؟',
  },
  en: {
    badge: 'An AI platform for directing government complaints',
    brand: 'Wasel',
    tagline: ' — get it to the right place',
    lead: 'Wasel helps you understand your complaint, identify the right government authority, and draft a professional complaint before you submit it.',
    start: 'Get started',
    how: 'How does Wasel work?',
  },
})

export async function HeroSection() {
  const locale = await getLocale()
  const copy = COPY[locale]
  // The arrow points forward in the reading direction.
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  // The background comes from the page-wide canvas in the marketing layout —
  // this section deliberately paints none of its own.
  return (
    <section className="relative">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 pt-16 pb-20 text-center md:px-6 md:pt-24 md:pb-28">
        <span className="border-primary/15 bg-surface/80 text-primary animate-fade-in shadow-soft inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.badge}
        </span>

        {/*
          The brand name carries the brand gradient; the rest of the line
          stays navy so the headline reads as identity first, message second.
        */}
        <h1 className="font-arabic animate-fade-up text-4xl leading-[1.2] font-bold tracking-tight text-balance sm:text-5xl md:text-[4rem]">
          <span className="text-brand-gradient">{copy.brand}</span>
          <span className="text-heading">{copy.tagline}</span>
        </h1>

        <p className="text-muted-foreground animate-fade-up max-w-2xl text-base leading-relaxed text-pretty [animation-delay:100ms] sm:text-lg">
          {copy.lead}
        </p>

        <div className="animate-fade-up mt-4 flex w-full flex-col items-center justify-center gap-3 [animation-delay:200ms] sm:w-auto sm:flex-row">
          <Link href="/wasal" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
            {copy.start}
            <ForwardArrow className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="#how-it-works" className={buttonClasses('outline', 'lg', 'w-full sm:w-auto')}>
            {copy.how}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-6 md:pb-24">
        <HeroIllustration />
      </div>
    </section>
  )
}
