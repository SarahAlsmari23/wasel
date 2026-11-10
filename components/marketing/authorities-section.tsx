import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AuthorityCard } from '@/components/marketing/authority-card'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Reveal } from '@/components/ui/reveal'
import { defineCopy } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { GOVERNMENT_ENTITIES } from '@/lib/mock/government-entities'

const COPY = defineCopy({
  ar: {
    eyebrow: 'التغطية',
    title: 'الجهات الحكومية المدعومة',
    description:
      'يستطيع واصل تحليل شكواك وتوجيهها إلى القطاعات التالية، مع إرشادك خطوة بخطوة حتى تصل إلى الجهة المختصة.',
    viewAll: 'تفاصيل الجهات وروابطها الرسمية',
  },
  en: {
    eyebrow: 'Coverage',
    title: 'Supported government authorities',
    description:
      'Wasel can analyse your complaint and direct it to the following sectors, guiding you step by step to the responsible authority.',
    viewAll: 'Authority details and official links',
  },
})

export async function AuthoritiesSection() {
  const locale = await getLocale()
  const copy = COPY[locale]
  const ForwardArrow = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section id="authorities" className="mx-auto w-full max-w-6xl px-5 md:px-6">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      {/* All five in one row on wide screens: a directory, not a card wall. */}
      <Reveal className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GOVERNMENT_ENTITIES.map((entity) => (
          <AuthorityCard key={entity.id} entity={entity} locale={locale} />
        ))}
      </Reveal>

      <Link
        href="/entities"
        className="text-primary hover:text-primary-hover mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      >
        {copy.viewAll}
        <ForwardArrow className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  )
}
