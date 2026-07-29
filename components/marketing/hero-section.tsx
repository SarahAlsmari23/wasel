import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { HeroIllustration } from '@/components/marketing/hero-illustration'
import { buttonClasses } from '@/components/ui/button'

export function HeroSection() {
  // The background comes from the page-wide canvas in the marketing layout —
  // this section deliberately paints none of its own.
  return (
    <section className="relative">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 pt-16 pb-20 text-center md:px-6 md:pt-24 md:pb-28">
        <span className="border-primary/15 bg-surface/80 text-primary animate-fade-in shadow-soft inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          منصة ذكية لتوجيه البلاغات الحكومية
        </span>

        {/*
          The brand name carries the green→teal gradient; the rest of the line
          stays navy so the headline reads as identity first, message second.
        */}
        <h1 className="font-arabic animate-fade-up text-4xl leading-[1.2] font-bold tracking-tight text-balance sm:text-5xl md:text-[4rem]">
          <span className="text-brand-gradient">واصل</span>
          <span className="text-heading">... خلها توصل صح</span>
        </h1>

        <p className="text-muted-foreground animate-fade-up max-w-2xl text-base leading-relaxed text-pretty [animation-delay:100ms] sm:text-lg">
          يساعدك واصل على فهم شكواك، وتحديد الجهة الحكومية المناسبة، وصياغة البلاغ باحترافية قبل
          إرساله.
        </p>

        <div className="animate-fade-up mt-4 flex w-full flex-col items-center justify-center gap-3 [animation-delay:200ms] sm:w-auto sm:flex-row">
          <Link href="/wasal" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
            ابدأ وخَلّها توصل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="#how-it-works" className={buttonClasses('outline', 'lg', 'w-full sm:w-auto')}>
            كيف يعمل واصل؟
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-6 md:pb-24">
        <HeroIllustration />
      </div>
    </section>
  )
}
