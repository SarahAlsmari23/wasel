import { FileSignature, MessageSquareText } from 'lucide-react'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Card } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    title: 'عن واصل',
    description:
      'واصل منصة ذكية تقف بين المستفيد والجهة الحكومية، لتحوّل شكوى مكتوبة بلغة عادية إلى بلاغ واضح موجّه إلى الجهة الصحيحة.',
    howTitle: 'كيف يعمل واصل؟',
    purposes: [
      {
        title: 'مساعد ذكي للأسئلة',
        description:
          'اسأل عن أي شيء يخص البلاغات الحكومية: الجهة المختصة، الإجراءات، المستندات المطلوبة، ومدة المعالجة.',
      },
      {
        title: 'منشئ بلاغات احترافي',
        description:
          'يجمع واصل تفاصيل شكواك عبر حوار بسيط، ثم يصيغ بلاغاً واضحاً ومهنياً جاهزاً لتقديمه إلى الجهة المناسبة.',
      },
    ],
  },
  en: {
    title: 'About Wasel',
    description:
      'Wasel is an AI platform that sits between you and the government authority, turning a complaint written in everyday language into a clear complaint directed to the right authority.',
    howTitle: 'How does Wasel work?',
    purposes: [
      {
        title: 'An AI assistant for your questions',
        description:
          'Ask anything about government complaints: the responsible authority, the procedure, required documents, and expected handling time.',
      },
      {
        title: 'A professional complaint builder',
        description:
          'Wasel collects your complaint details through a simple conversation, then drafts a clear, professional complaint ready to submit to the right authority.',
      },
    ],
  },
})

const PURPOSE_ICONS = [MessageSquareText, FileSignature] as const

type AboutSectionProps = {
  // /about already has its own "about" heading + description right above
  // where this section is rendered, so it hides this one.
  showHeading?: boolean
  // /about renders "How it works" itself, further down the page.
  showHowItWorks?: boolean
}

export async function AboutSection({
  showHeading = true,
  showHowItWorks = true,
}: AboutSectionProps = {}) {
  const copy = COPY[await getLocale()]

  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      {showHeading ? <SectionHeading title={copy.title} description={copy.description} /> : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {copy.purposes.map((purpose, index) => {
          const Icon = PURPOSE_ICONS[index]
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

      {showHowItWorks ? (
        <>
          <h3 className="text-heading mt-16 text-center text-xl font-semibold sm:text-2xl">
            {copy.howTitle}
          </h3>

          <Reveal className="mt-8">
            <HowItWorks />
          </Reveal>
        </>
      ) : null}
    </section>
  )
}
