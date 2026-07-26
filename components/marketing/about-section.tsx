import { FileSignature, MessageSquareText } from 'lucide-react'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Card } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'

const PURPOSES = [
  {
    icon: MessageSquareText,
    title: 'مساعد ذكي للأسئلة',
    description:
      'اسأل عن أي شيء يخص البلاغات الحكومية: الجهة المختصة، الإجراءات، المستندات المطلوبة، ومدة المعالجة — دون الحاجة إلى حساب.',
  },
  {
    icon: FileSignature,
    title: 'منشئ بلاغات احترافي',
    description:
      'يجمع واصل تفاصيل شكواك عبر حوار بسيط، ثم يصيغ بلاغاً واضحاً ومهنياً جاهزاً لتقديمه إلى الجهة المناسبة.',
  },
]

export function AboutSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <SectionHeading
        eyebrow="عن واصل"
        title="ما هي واصل؟"
        description="واصل منصة ذكية تقف بين المستفيد والجهة الحكومية، لتحوّل شكوى مكتوبة بلغة عادية إلى بلاغ واضح موجّه إلى الجهة الصحيحة."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {PURPOSES.map((purpose, index) => {
          const Icon = purpose.icon
          return (
            <Reveal key={purpose.title} delay={index * 0.08}>
              <Card className="flex h-full flex-col gap-4">
                <span className="bg-secondary/12 text-secondary flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-heading text-lg font-semibold">{purpose.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {purpose.description}
                </p>
              </Card>
            </Reveal>
          )
        })}
      </div>

      <h3 className="text-heading mt-16 text-center text-xl font-semibold sm:text-2xl">
        كيف يعمل واصل؟
      </h3>

      <Reveal className="mt-8">
        <HowItWorks />
      </Reveal>
    </section>
  )
}
