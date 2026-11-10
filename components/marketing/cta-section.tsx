import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    title: 'ابدأ رحلتك الآن',
    body: 'اطرح سؤالك على واصل، أو دع المساعد الذكي يجهّز لك بلاغاً احترافياً موجّهاً إلى الجهة المختصة.',
    action: 'ابدأ الخدمة',
  },
  en: {
    title: 'Start your journey now',
    body: 'Ask Wasel your question, or let the AI assistant prepare a professional complaint directed to the responsible authority.',
    action: 'Start now',
  },
})

export async function CtaSection() {
  const locale = await getLocale()
  const copy = COPY[locale]
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <Reveal>
        <div className="bg-surface/80 border-border shadow-soft flex flex-col items-center gap-5 rounded-3xl border px-6 py-16 text-center backdrop-blur-sm md:px-12">
          <h2 className="font-arabic text-primary text-3xl font-semibold text-balance sm:text-4xl">
            {copy.title}
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
            {copy.body}
          </p>
          <Link href="/wasal" className={buttonClasses('primary', 'lg', 'mt-2 w-full sm:w-auto')}>
            {copy.action}
            <ForwardArrow className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
