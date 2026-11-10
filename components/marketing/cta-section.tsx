import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { cn } from '@/lib/utils/cn'

const COPY = defineCopy({
  ar: {
    title: 'ابدأ رحلتك الآن',
    body: 'اطرح سؤالك على واصل، أو دع المساعد الذكي يجهّز لك بلاغاً احترافياً موجّهاً إلى الجهة المختصة.',
    action: 'ابدأ الخدمة',
    secondary: 'تصفّح الجهات',
  },
  en: {
    title: 'Get started now',
    body: 'Ask Wasel your question, or let the AI assistant prepare a professional complaint directed to the responsible authority.',
    action: 'Start now',
    secondary: 'Browse authorities',
  },
})

/**
 * The closing call to action: the brand's navy panel with the network
 * artwork — the one dark band on the page, so the page ends on the identity.
 */
export async function CtaSection() {
  const locale = await getLocale()
  const copy = COPY[locale]
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <Reveal>
        <div className="bg-wasel-panel text-surface-dark-foreground flex flex-col items-start gap-6 overflow-hidden rounded-3xl px-6 py-12 sm:px-10 md:flex-row md:items-center md:justify-between md:px-14 md:py-14">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="font-arabic text-3xl font-semibold text-balance sm:text-4xl">
              {copy.title}
            </h2>
            <p className="text-surface-dark-foreground/75 text-sm leading-relaxed text-pretty sm:text-base">
              {copy.body}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/wasal"
              className={cn(
                'bg-sidebar-cta text-sidebar-cta-foreground hover:bg-sidebar-cta-hover inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors duration-200',
              )}
            >
              {copy.action}
              <ForwardArrow className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/entities"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/8"
            >
              {copy.secondary}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
