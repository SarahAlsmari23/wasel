import type { Metadata } from 'next'
import { AboutSection } from '@/components/marketing/about-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Card } from '@/components/ui/card'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'

const COPY = defineCopy({
  ar: {
    metaTitle: 'عن واصل',
    metaDescription: 'تعرّف على واصل، ولماذا أُنشئ، وكيف يعمل.',
    title: 'عن واصل',
    lead: 'واصل منصة ذكية تعتمد على الذكاء الاصطناعي لمساعدتك في فهم شكواك، وتحديد الجهة الحكومية المختصة، وصياغة بلاغ احترافي جاهز للتقديم — باختصار الوقت والجهد.',
    whyEyebrow: 'لماذا واصل؟',
    whyTitle: 'ثلاث مشكلات تحلّها المنصة',
    whyDescription: 'صُمّم واصل لمعالجة أكثر ما يعطّل وصول البلاغات إلى حلّ.',
    reasons: [
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
    ],
    howTitle: 'كيف يعمل واصل؟',
  },
  en: {
    metaTitle: 'About Wasel',
    metaDescription: 'Learn about Wasel, why it was built, and how it works.',
    title: 'About Wasel',
    lead: 'Wasel is an AI-powered platform that helps you understand your complaint, identify the responsible government authority, and draft a professional complaint ready to submit — saving you time and effort.',
    whyEyebrow: 'Why Wasel?',
    whyTitle: 'Three problems the platform solves',
    whyDescription:
      'Wasel was designed to address what most often stops complaints from being resolved.',
    reasons: [
      {
        title: 'The right authority, first time',
        description:
          'Many complaints are delayed because they reach the wrong authority. Wasel analyses your complaint and directs it to the responsible authority.',
      },
      {
        title: 'Clear, professional wording',
        description:
          'A clearly written complaint is handled faster. Wasel turns your everyday description into an organised complaint with only the details that matter.',
      },
      {
        title: 'No missing information',
        description:
          "Wasel asks for what your complaint is missing before you submit it, and explains each authority's required documents and submission steps.",
      },
    ],
    howTitle: 'How does Wasel work?',
  },
})

export async function generateMetadata(): Promise<Metadata> {
  const copy = COPY[await getLocale()]
  return { title: copy.metaTitle, description: copy.metaDescription }
}

export default async function AboutPage() {
  const copy = COPY[await getLocale()]

  return (
    <div className="flex flex-col gap-24 pb-24 md:gap-28">
      {/*
        Hero + the purpose cards share a smaller, dedicated gap than the rest
        of the page's sections (gap-24/28 below).
      */}
      <div className="flex flex-col gap-16 md:gap-20">
        <section>
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 pt-16 pb-6 text-center md:px-6 md:pt-24 md:pb-8">
            <h1 className="font-arabic text-primary animate-fade-up text-4xl font-semibold text-balance sm:text-5xl">
              {copy.title}
            </h1>
            <p className="text-muted-foreground animate-fade-up text-base leading-relaxed text-pretty [animation-delay:100ms] sm:text-lg">
              {copy.lead}
            </p>
          </div>
        </section>

        <AboutSection showHeading={false} showHowItWorks={false} />
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
        <SectionHeading
          eyebrow={copy.whyEyebrow}
          title={copy.whyTitle}
          description={copy.whyDescription}
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.reasons.map((reason, index) => (
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
          {copy.howTitle}
        </h3>

        <Reveal className="mt-8">
          <HowItWorks />
        </Reveal>
      </section>

      <CtaSection />
    </div>
  )
}
