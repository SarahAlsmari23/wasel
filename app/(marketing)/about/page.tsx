import type { Metadata } from 'next'
import { AboutSection } from '@/components/marketing/about-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Card } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'

export const metadata: Metadata = {
  title: 'عن واصل',
  description: 'تعرّف على واصل، ولماذا أُنشئت، وكيف تعمل.',
}

const REASONS = [
  {
    title: 'الجهة الصحيحة من المرة الأولى',
    description:
      'كثير من البلاغات تتأخر لأنها وصلت إلى الجهة الخطأ. يحلل واصل شكواك ويوجّهها إلى الجهة المختصة مباشرة.',
  },
  {
    title: 'صياغة مهنية واضحة',
    description:
      'البلاغ المكتوب بوضوح يُعالج أسرع. يحوّل واصل وصفك العادي إلى بلاغ منظّم يذكر التفاصيل المهمة فقط.',
  },
  {
    title: 'لا معلومات ناقصة',
    description:
      'يسأل واصل عمّا ينقص بلاغك قبل إرساله، ويوضح لك المستندات المطلوبة وخطوات التقديم لدى كل جهة.',
  },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-24 pb-24 md:gap-28">
      {/*
        Hero + the purpose cards share a smaller, dedicated gap than the rest
        of the page's sections (gap-24/28 below) — as one flex item, this
        wrapper's own transition to the next section still uses that same
        gap-24/28, unchanged. The hero's own bottom padding is also trimmed
        (top padding untouched) since it was stacking on top of the section
        gap to produce roughly double the intended whitespace.
      */}
      <div className="flex flex-col gap-16 md:gap-20">
        <section>
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 pt-16 pb-6 text-center md:px-6 md:pt-24 md:pb-8">
            <h1 className="font-arabic text-primary animate-fade-up text-4xl font-semibold text-balance sm:text-5xl">
              عن واصل
            </h1>
            <p className="text-muted-foreground animate-fade-up text-base leading-relaxed text-pretty [animation-delay:100ms] sm:text-lg">
              واصل منصة ذكية تعتمد على الذكاء الاصطناعي لمساعدتك في فهم شكواك، وتحديد الجهة الحكومية
              المختصة، وصياغة بلاغ احترافي جاهز للتقديم — باختصار الوقت والجهد.
            </p>
          </div>
        </section>

        <AboutSection showHeading={false} showHowItWorks={false} />
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
        <SectionHeading
          eyebrow="لماذا واصل؟"
          title="ثلاث مشكلات تحلّها المنصة"
          description="صُمّمت واصل لمعالجة أكثر ما يعطّل وصول البلاغات إلى حلّ."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {REASONS.map((reason, index) => (
            <Reveal key={reason.title} delay={index * 0.08}>
              <Card className="flex h-full flex-col gap-3">
                <h3 className="text-heading text-base font-semibold">{reason.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {reason.description}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
        <h3 className="text-heading text-center text-xl font-semibold sm:text-2xl">
          كيف يعمل واصل؟
        </h3>

        <Reveal className="mt-8">
          <HowItWorks />
        </Reveal>
      </section>

      <CtaSection />
    </div>
  )
}
