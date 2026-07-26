import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <Reveal>
        <div className="bg-surface/80 border-border shadow-soft flex flex-col items-center gap-5 rounded-3xl border px-6 py-16 text-center backdrop-blur-sm md:px-12">
          <h2 className="font-arabic text-primary text-3xl font-semibold text-balance sm:text-4xl">
            ابدأ رحلتك الآن
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
            اطرح سؤالك على واصل، أو دع المساعد الذكي يجهّز لك بلاغاً احترافياً موجّهاً إلى الجهة
            المختصة.
          </p>
          <Link href="/wasal" className={buttonClasses('primary', 'lg', 'mt-2 w-full sm:w-auto')}>
            ابدأ الخدمة
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
