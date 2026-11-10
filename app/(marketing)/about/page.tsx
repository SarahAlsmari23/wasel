import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
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
    lead: 'واصل منصة تعتمد على الذكاء الاصطناعي لمساعدتك في فهم شكواك، وتحديد الجهة الحكومية المختصة، وصياغة بلاغ احترافي جاهز للتقديم — باختصار الوقت والجهد.',
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
    responsibleTitle: 'ذكاء اصطناعي مسؤول',
    responsible: [
      'واصل مساعد ذكي وليس جهة حكومية، ولا يقدّم البلاغ نيابةً عنك — أنت من يراجع البلاغ ويقدّمه عبر القناة الرسمية.',
      'يعتمد واصل في معلومات الجهات على مصادر رسمية موثّقة، ويصرّح بوضوح عندما لا تتوفر لديه معلومة موثوقة بدلاً من التخمين.',
      'لا يقدّم واصل استشارات قانونية، وقد يخطئ؛ راجع البلاغ وتحقق من المعلومات قبل تقديمه.',
    ],
    privacyLink: 'اطّلع على سياسة الخصوصية',
    howTitle: 'كيف يعمل واصل؟',
    howEyebrow: 'الخطوات',
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
    responsibleTitle: 'Responsible AI',
    responsible: [
      'Wasel is an AI assistant, not a government authority, and it never submits complaints on your behalf — you review the complaint and submit it yourself through the official channel.',
      "Authority information comes from verified official sources, and Wasel says so plainly when it doesn't have reliable information instead of guessing.",
      'Wasel does not provide legal advice and can make mistakes; review the complaint and verify the details before you submit it.',
    ],
    privacyLink: 'Read the privacy policy',
    howTitle: 'How does Wasel work?',
    howEyebrow: 'The steps',
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
      {/* Hero + purpose cards share a tighter gap than the rest of the page. */}
      <div className="flex flex-col gap-6 md:gap-8">
        <section>
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 pt-16 pb-6 text-center md:px-6 md:pt-24 md:pb-8">
            <span className="eyebrow animate-fade-in self-center">واصل · Wasel</span>
            <h1 className="font-arabic text-heading animate-fade-up text-4xl font-semibold text-balance sm:text-5xl">
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

        <Reveal className="mt-10 grid gap-x-8 gap-y-2 md:grid-cols-3">
          {copy.reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="border-border flex flex-col gap-2 border-t pt-6 md:pt-7"
            >
              <span className="text-primary text-xs font-semibold tabular-nums">0{index + 1}</span>
              <h3 className="text-heading text-base font-semibold">{reason.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{reason.description}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 md:px-6">
        <Reveal>
          <Card className="border-primary/20 flex flex-col gap-4 border-s-4">
            <div className="flex items-center gap-3">
              <span className="bg-surface-tint text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-heading text-lg font-semibold">{copy.responsibleTitle}</h2>
            </div>
            <ul className="text-muted-foreground flex list-disc flex-col gap-2 ps-5 text-sm leading-relaxed">
              {copy.responsible.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              href="/privacy"
              className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
            >
              {copy.privacyLink}
            </Link>
          </Card>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 md:px-6">
        <SectionHeading eyebrow={copy.howEyebrow} title={copy.howTitle} />

        <Reveal className="mt-8">
          <HowItWorks />
        </Reveal>
      </section>

      <CtaSection />
    </div>
  )
}
