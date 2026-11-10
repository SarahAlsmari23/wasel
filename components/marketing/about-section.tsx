import { FileSignature, MessageSquareText } from 'lucide-react'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    eyebrow: 'عن واصل',
    title: 'من وصف عادي إلى بلاغ رسمي واضح',
    description:
      'واصل منصة ذكية تقف بين المستفيد والجهة الحكومية، لتحوّل شكوى مكتوبة بلغة عادية إلى بلاغ واضح موجّه إلى الجهة الصحيحة.',
    howEyebrow: 'الخطوات',
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
    eyebrow: 'About Wasel',
    title: 'From everyday words to a clear, formal complaint',
    description:
      'Wasel is an AI platform that sits between you and the government authority, turning a complaint written in everyday language into a clear complaint directed to the right authority.',
    howEyebrow: 'The steps',
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
  showHeading?: boolean
  showHowItWorks?: boolean
}

export async function AboutSection({
  showHeading = true,
  showHowItWorks = true,
}: AboutSectionProps = {}) {
  const copy = COPY[await getLocale()]

  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      {showHeading ? (
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      ) : null}

      {/* Two purposes as a ruled pair, not two more cards. */}
      <Reveal
        className={`border-border grid border-t md:grid-cols-2 ${showHeading ? 'mt-10' : ''}`}
      >
        {copy.purposes.map((purpose, index) => {
          const Icon = PURPOSE_ICONS[index]
          return (
            <div
              key={purpose.title}
              className={
                index === 1
                  ? 'border-border flex gap-4 border-t py-7 md:border-s md:border-t-0 md:ps-8'
                  : 'flex gap-4 py-7 md:pe-8'
              }
            >
              <span className="bg-surface-tint text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-heading text-base font-semibold">{purpose.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {purpose.description}
                </p>
              </div>
            </div>
          )
        })}
      </Reveal>

      {showHowItWorks ? (
        <div className="mt-20 flex flex-col gap-8">
          <SectionHeading eyebrow={copy.howEyebrow} title={copy.howTitle} />
          <Reveal>
            <HowItWorks />
          </Reveal>
        </div>
      ) : null}
    </section>
  )
}
